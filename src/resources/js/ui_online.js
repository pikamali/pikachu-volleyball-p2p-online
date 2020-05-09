/**
 * Manages outputs to and inputs from the html elements UI
 * and event listeners relevant to the UI of the web page
 */
'use strict';
import {
  channel,
  createRoom,
  joinRoom,
  sendChatMessageToPeer,
  closeAndCleaning,
  sendOptionsChangeMessageToPeer,
  sendOptionsChangeAgreeMessageToPeer,
} from './data_channel.js';
import { generatePushID } from './generate_pushid.js';
import { myKeyboard } from './keyboard_online.js';
import { testNetwork } from './network_test.js';
import {
  MESSAGE_TO_CLIENT,
  startQuickMatch,
  sendCancelQuickMatchMessageToServer,
} from './quick_match.js';
import '../style.css';

let applyOptions = null; // it is assigned a function after the game assets are loaded

const pendingOptions = {
  toSend: null,
  received: null,
};

const chatOpenBtn = document.getElementById('chat-open-btn');
const chatInputAndSendBtnContainer = document.getElementById(
  'chat-input-and-send-btn-container'
);
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

export function setUpUI() {
  // game keyboard input needs to be unsubscribe for typing join room ID
  myKeyboard.unsubscribe();

  const optionsDropdownBtn = document.getElementById('options-dropdown-btn');
  // @ts-ignore
  optionsDropdownBtn.disabled = true;

  const networkTestBtn = document.getElementById('network-test-btn');
  const quickMatchBtn = document.getElementById('quick-match-btn');
  const withYourFriendBtn = document.getElementById('with-your-friend-btn');
  const createBtn = document.getElementById('create-btn');
  const joinBtn = document.getElementById('join-btn');
  const joinRoomIdInput = document.getElementById('join-room-id-input');
  const disableBtns = () => {
    // @ts-ignore
    networkTestBtn.disabled = true;
    // @ts-ignore
    quickMatchBtn.disabled = true;
    // @ts-ignore
    withYourFriendBtn.disabled = true;
    // @ts-ignore
    createBtn.disabled = true;
    // @ts-ignore
    joinBtn.disabled = true;
    // @ts-ignore
    joinRoomIdInput.disabled = true;
  };
  const enableBtns = () => {
    // @ts-ignore
    networkTestBtn.disabled = false;
    if (
      document
        .getElementById('about-with-your-friend')
        .classList.contains('hidden')
    ) {
      // @ts-ignore
      quickMatchBtn.disabled = false;
    }
    // @ts-ignore
    withYourFriendBtn.disabled = false;
    // @ts-ignore
    createBtn.disabled = false;
    // @ts-ignore
    joinBtn.disabled = false;
    // @ts-ignore
    joinRoomIdInput.disabled = false;
  };
  networkTestBtn.addEventListener('click', () => {
    disableBtns();
    const callBackIfPassed = () => {
      document.getElementById('test-passed').classList.remove('hidden');
    };
    const callBackIfDidNotGetSrflx = () => {
      document
        .getElementById('did-not-get-srflx-candidate')
        .classList.remove('hidden');
    };
    const callBackIfDidNotGetSrflxAndHostAddressIsObfuscated = () => {
      document
        .getElementById(
          'did-not-get-srflx-candidate-and-host-address-is-obfuscated'
        )
        .classList.remove('hidden');
    };
    const callBackIfBehindSymmetricNat = () => {
      document
        .getElementById('behind-symmetric-nat')
        .classList.remove('hidden');
    };
    testNetwork(
      enableBtns,
      callBackIfPassed,
      callBackIfDidNotGetSrflx,
      callBackIfDidNotGetSrflxAndHostAddressIsObfuscated,
      callBackIfBehindSymmetricNat
    );
  });
  const startQuickMatchIfPressEnter = (event) => {
    if (event.code === 'Enter') {
      event.preventDefault();
      window.removeEventListener('keydown', startQuickMatchIfPressEnter);
      const pressEnterToQuickMatch = document.getElementById(
        'press-enter-to-quick-match'
      );
      if (!pressEnterToQuickMatch.classList.contains('hidden')) {
        pressEnterToQuickMatch.classList.add('hidden');
      }
      const callBackIfPassed = () => {
        document
          .getElementById('quick-match-notice-box')
          .classList.remove('hidden');

        const roomId = generatePushID();
        startQuickMatch(roomId);
      };
      const callBackIfDidNotGetSrflx = () => {
        document
          .getElementById('did-not-get-srflx-candidate')
          .classList.remove('hidden');
        enableBtns();
      };
      const callBackIfDidNotGetSrflxAndHostAddressIsObfuscated = () => {
        document
          .getElementById(
            'did-not-get-srflx-candidate-and-host-address-is-obfuscated'
          )
          .classList.remove('hidden');
        enableBtns();
      };
      const callBackIfBehindSymmetricNat = () => {
        document
          .getElementById('behind-symmetric-nat')
          .classList.remove('hidden');
        enableBtns();
      };
      // Start quick match only if user network passed the network test.
      testNetwork(
        () => {},
        callBackIfPassed,
        callBackIfDidNotGetSrflx,
        callBackIfDidNotGetSrflxAndHostAddressIsObfuscated,
        callBackIfBehindSymmetricNat
      );
    }
  };
  quickMatchBtn.addEventListener('click', () => {
    disableBtns();
    channel.isQuickMatch = true;
    window.addEventListener('keydown', startQuickMatchIfPressEnter);
    const pressEnterToQuickMatch = document.getElementById(
      'press-enter-to-quick-match'
    );
    pressEnterToQuickMatch.classList.remove('hidden');
  });
  withYourFriendBtn.addEventListener('click', () => {
    const aboutWithYourFriend = document.getElementById(
      'about-with-your-friend'
    );
    if (aboutWithYourFriend.classList.contains('hidden')) {
      aboutWithYourFriend.classList.remove('hidden');
      // @ts-ignore
      quickMatchBtn.disabled = true;
    } else {
      aboutWithYourFriend.classList.add('hidden');
      // @ts-ignore
      quickMatchBtn.disabled = false;
    }
  });
  createBtn.addEventListener('click', () => {
    disableBtns();
    // @ts-ignore
    document.getElementById('join-room-id-input').value = '';
    channel.isQuickMatch = false;

    const roomId = generatePushID();
    createRoom(roomId).then(() => {
      printCurrentRoomID(roomId);
    });
  });
  joinBtn.addEventListener('click', () => {
    disableBtns();
    channel.isQuickMatch = false;

    const roomId = getJoinRoomID();
    joinRoom(roomId).then((joined) => {
      if (joined) {
        printCurrentRoomID(roomId);
      } else {
        enableBtns();
      }
    });
  });

  // hide or show menubar if the user presses the "esc" key
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Escape') {
      const menuBar = document.getElementById('menu-bar');
      if (menuBar.classList.contains('hidden')) {
        menuBar.classList.remove('hidden');
      } else {
        menuBar.classList.add('hidden');
      }
      event.preventDefault();
    }
  });

  chatOpenBtn.addEventListener('click', chatOpenBtnClicked);
  sendBtn.addEventListener('click', sendBtnClicked);
  channel.callbackAfterDataChannelOpenedForUI = () => {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        if (!chatOpenBtn.classList.contains('hidden')) {
          chatOpenBtn.click();
          event.preventDefault();
        }
      } else if (event.code === 'Enter') {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      if (event.code === 'Enter') {
        if (!chatInputAndSendBtnContainer.classList.contains('hidden')) {
          window.setTimeout(() => sendBtn.click(), 0);
        }
      }
    });
  };

  attachEventListenerToHideBtn('test-passed-ok-btn', 'test-passed');
  attachEventListenerToHideBtn(
    'did-not-get-srflx-candidate-ok-btn',
    'did-not-get-srflx-candidate'
  );
  attachEventListenerToHideBtn(
    'did-not-get-srflx-candidate-and-host-address-is-obfuscated-ok-btn',
    'did-not-get-srflx-candidate-and-host-address-is-obfuscated'
  );
  attachEventListenerToHideBtn(
    'behind-symmetric-nat-ok-btn',
    'behind-symmetric-nat'
  );

  const cancelQuickMatchBtn = document.getElementById('cancel-quick-match-btn');
  cancelQuickMatchBtn.addEventListener('click', () => {
    const pressEnterToQuickMatch = document.getElementById(
      'press-enter-to-quick-match'
    );
    if (!pressEnterToQuickMatch.classList.contains('hidden')) {
      pressEnterToQuickMatch.classList.add('hidden');
    }
    enableBtns();
  });

  const cancelQuickMatchBtn2 = document.getElementById(
    'cancel-quick-match-btn-2'
  );
  cancelQuickMatchBtn2.addEventListener('click', () => {
    sendCancelQuickMatchMessageToServer();
    location.reload();
  });

  const noticeDisconnectedOKBtn = document.getElementById(
    'notice-disconnected-ok-btn'
  );
  noticeDisconnectedOKBtn.addEventListener('click', () => {
    location.reload();
  });

  const askOneMoreGameYesBtn = document.getElementById(
    'ask-one-more-game-yes-btn'
  );
  askOneMoreGameYesBtn.addEventListener('click', () => {
    const askOneMoreGameBox = document.getElementById('ask-one-more-game');
    if (!askOneMoreGameBox.classList.contains('hidden')) {
      askOneMoreGameBox.classList.add('hidden');
    }
  });

  const askOneMoreGameNoBtn = document.getElementById(
    'ask-one-more-game-no-btn'
  );
  askOneMoreGameNoBtn.addEventListener('click', () => {
    location.reload();
  });

  window.addEventListener('unload', closeAndCleaning);

  window.addEventListener('beforeunload', function (e) {
    if (channel.isOpen) {
      // Cancel the event
      e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
      // Chrome requires returnValue to be set
      e.returnValue = '';
    }
  });

  disableChatBtns();
}

export function setUpUIAfterLoadingGameAssets(pikaVolley, ticker) {
  setUpOptionsBtn(pikaVolley);
  setUpToShowDropdownsAndSubmenus();
  applyOptions = (options) => {
    if (options.speed) {
      const slowSpeedBtn = document.getElementById('slow-speed-btn');
      const mediumSpeedBtn = document.getElementById('medium-speed-btn');
      const fastSpeedBtn = document.getElementById('fast-speed-btn');
      switch (options.speed) {
        case 'slow':
          mediumSpeedBtn.classList.remove('selected');
          fastSpeedBtn.classList.remove('selected');
          slowSpeedBtn.classList.add('selected');
          pikaVolley.normalFPS = 20;
          ticker.maxFPS = pikaVolley.normalFPS;
          break;
        case 'medium':
          fastSpeedBtn.classList.remove('selected');
          slowSpeedBtn.classList.remove('selected');
          mediumSpeedBtn.classList.add('selected');
          pikaVolley.normalFPS = 25;
          ticker.maxFPS = pikaVolley.normalFPS;
          break;
        case 'fast':
          slowSpeedBtn.classList.remove('selected');
          mediumSpeedBtn.classList.remove('selected');
          fastSpeedBtn.classList.add('selected');
          pikaVolley.normalFPS = 30;
          ticker.maxFPS = pikaVolley.normalFPS;
          break;
      }
    } else if (options.winningScore) {
      const winningScore5Btn = document.getElementById('winning-score-5-btn');
      const winningScore10Btn = document.getElementById('winning-score-10-btn');
      const winningScore15Btn = document.getElementById('winning-score-15-btn');
      switch (options.winningScore) {
        case 5:
          winningScore10Btn.classList.remove('selected');
          winningScore15Btn.classList.remove('selected');
          winningScore5Btn.classList.add('selected');
          pikaVolley.winningScore = 5;
          break;
        case 10:
          winningScore15Btn.classList.remove('selected');
          winningScore5Btn.classList.remove('selected');
          winningScore10Btn.classList.add('selected');
          pikaVolley.winningScore = 10;
          break;
        case 15:
          winningScore5Btn.classList.remove('selected');
          winningScore10Btn.classList.remove('selected');
          winningScore15Btn.classList.add('selected');
          pikaVolley.winningScore = 15;
          break;
      }
    }
  };

  const askOptionsChangeSendToPeerBox = document.getElementById(
    'ask-options-change-send-to-peer'
  );
  const askOptionsChangeSendToPeerBoxYesBtn = document.getElementById(
    'ask-options-change-send-to-peer-yes-btn'
  );
  const askOptionsChangeSendToPeerBoxNoBtn = document.getElementById(
    'ask-options-change-send-to-peer-no-btn'
  );
  askOptionsChangeSendToPeerBoxYesBtn.addEventListener('click', () => {
    sendOptionsChangeMessageToPeer(pendingOptions.toSend);
    if (!askOptionsChangeSendToPeerBox.classList.contains('hidden')) {
      askOptionsChangeSendToPeerBox.classList.add('hidden');
    }
  });
  askOptionsChangeSendToPeerBoxNoBtn.addEventListener('click', () => {
    if (!askOptionsChangeSendToPeerBox.classList.contains('hidden')) {
      askOptionsChangeSendToPeerBox.classList.add('hidden');
    }
    enableOptionsBtn();
  });

  const askOptionsChangeReceivedFromPeerBox = document.getElementById(
    'ask-options-change-received-from-peer'
  );
  const askOptionsChangeReceivedFromPeerBoxYesBtn = document.getElementById(
    'ask-options-change-received-from-peer-yes-btn'
  );
  const askOptionsChangeReceivedFromPeerBoxNoBtn = document.getElementById(
    'ask-options-change-received-from-peer-no-btn'
  );
  askOptionsChangeReceivedFromPeerBoxYesBtn.addEventListener('click', () => {
    if (!askOptionsChangeReceivedFromPeerBox.classList.contains('hidden')) {
      askOptionsChangeReceivedFromPeerBox.classList.add('hidden');
    }
    sendOptionsChangeAgreeMessageToPeer(true);
    applyOptions(pendingOptions.received);
    enableOptionsBtn();
  });
  askOptionsChangeReceivedFromPeerBoxNoBtn.addEventListener('click', () => {
    if (!askOptionsChangeReceivedFromPeerBox.classList.contains('hidden')) {
      askOptionsChangeReceivedFromPeerBox.classList.add('hidden');
    }
    sendOptionsChangeAgreeMessageToPeer(false);
    enableOptionsBtn();
  });

  const noticePeerAgreedBox = document.getElementById('notice-peer-agreed');
  const noticePeerAgreedBoxOKBtn = document.getElementById(
    'notice-peer-agreed-ok-btn'
  );
  noticePeerAgreedBoxOKBtn.addEventListener('click', () => {
    if (!noticePeerAgreedBox.classList.contains('hidden')) {
      noticePeerAgreedBox.classList.add('hidden');
    }
    enableOptionsBtn();
  });
  const noticePeerDisagreedBox = document.getElementById(
    'notice-peer-disagreed'
  );
  const noticePeerDisagreedBoxOKBtn = document.getElementById(
    'notice-peer-disagreed-ok-btn'
  );
  noticePeerDisagreedBoxOKBtn.addEventListener('click', () => {
    if (!noticePeerDisagreedBox.classList.contains('hidden')) {
      noticePeerDisagreedBox.classList.add('hidden');
    }
    enableOptionsBtn();
  });
}

function printCurrentRoomID(roomId) {
  const prettyRoomId = `${roomId.slice(0, 5)}-${roomId.slice(
    5,
    10
  )}-${roomId.slice(10, 15)}-${roomId.slice(15)}`;
  document.getElementById('current-room-id').textContent = prettyRoomId;
}

function getJoinRoomID() {
  return (
    document
      .getElementById('join-room-id-input')
      // @ts-ignore
      .value.trim()
      .split('-')
      .join('')
  );
}

export function disableCancelQuickMatchBtn() {
  // @ts-ignore
  document.getElementById('cancel-quick-match-btn-2').disabled = true;
}

/**
 * Print communication count
 * @param {number} count
 */
export function printCommunicationCount(count) {
  document.getElementById('communication-count').textContent = String(count);
}

/**
 * Print quick match state to quick match log box
 * @param {string} state MESSAGE_TO_CLIENT.x
 */
export function printQuickMatchState(state) {
  let log = '';
  switch (state) {
    case MESSAGE_TO_CLIENT.createRoom:
      log = document.getElementById('waiting-message').textContent;
      break;
    case MESSAGE_TO_CLIENT.keepWait:
      return;
    case MESSAGE_TO_CLIENT.waitPeerConnection:
      log = document.getElementById('waiting-peer-to-connect-message')
        .textContent;
      break;
    case MESSAGE_TO_CLIENT.connectToPeerAfterAWhile:
      log = document.getElementById('connect-to-peer-after-a-while-message')
        .textContent;
      break;
    case MESSAGE_TO_CLIENT.connectToPeer:
      log = document.getElementById('connect-to-peer-message').textContent;
      break;
    case MESSAGE_TO_CLIENT.abandoned:
      log = document.getElementById('abandoned-message').textContent;
      break;
    default:
      return;
  }
  printQuickMatchLog(log);
}

export function printFailedToConnectToQuickMatchServer() {
  const log = document.getElementById('failed-to-connect-to-server')
    .textContent;
  printQuickMatchLog(log);
}

/**
 * Print log to quick match log box
 * @param {string} log
 */
export function printQuickMatchLog(log) {
  const connectionLog = document.getElementById('quick-match-log');
  connectionLog.textContent += `${log}\n`;
  connectionLog.scrollIntoView();
}

/**
 * Print number of successful quick matches
 * @param {number} withinLast24hours
 * @param {number} withinLast1hour
 * @param {number} withinLast10minutes
 */
export function printNumberOfSuccessfulQuickMatches(
  withinLast24hours,
  withinLast1hour,
  withinLast10minutes
) {
  document.getElementById('within-24-hours').textContent = String(
    withinLast24hours
  );
  document.getElementById('within-1-hour').textContent = String(
    withinLast1hour
  );
  document.getElementById('within-10-minutes').textContent = String(
    withinLast10minutes
  );
}

/**
 * Print log to connection log box
 * @param {string} log
 */
export function printLog(log) {
  let elementId = 'connection-log-with-friend';
  if (channel.isQuickMatch) {
    elementId = 'connection-log-quick-match';
  }
  const connectionLog = document.getElementById(elementId);
  connectionLog.textContent += `${log}\n`;
  connectionLog.scrollIntoView();
}

export function printPeriodInLog() {
  let elementId = 'connection-log-with-friend';
  if (channel.isQuickMatch) {
    elementId = 'connection-log-quick-match';
  }
  const connectionLog = document.getElementById(elementId);
  connectionLog.textContent += '.';
  connectionLog.scrollIntoView();
}

export function printNotValidRoomIdMessage() {
  printLog(document.getElementById('not-valid-room-id-message').textContent);
}

export function printNoRoomMatchingMessage() {
  printLog(document.getElementById('no-room-matching-message').textContent);
}

export function showGameCanvas() {
  const flexContainer = document.getElementById('flex-container');
  const beforeConnection = document.getElementById('before-connection');
  if (!beforeConnection.classList.contains('hidden')) {
    beforeConnection.classList.add('hidden');
  }
  flexContainer.classList.remove('hidden');
  myKeyboard.subscribe();
}

export function hidePingBox() {
  const pingBox = document.getElementById('ping-box');
  if (!pingBox.classList.contains('hidden')) {
    pingBox.classList.add('hidden');
  }
}

export function printAvgPing(avgPing) {
  document.getElementById('average-ping').textContent = String(avgPing);
}

export function printStartsIn(startsIn) {
  document.getElementById('starts-in').textContent = String(startsIn);
}

export function hideWatingPeerAssetsLoadingBox() {
  const peerLoadingBox = document.getElementById('peer-loading-box');
  if (!peerLoadingBox.classList.contains('hidden')) {
    peerLoadingBox.classList.add('hidden');
  }
}

/**
 * Process options change agree/disagree message from peer
 * @param {boolean} agree agree (true) or disagree (false)
 */
export function noticeAgreeMessageFromPeer(agree) {
  if (agree) {
    applyOptions(pendingOptions.toSend);
    const noticePeerAgreedBox = document.getElementById('notice-peer-agreed');
    noticePeerAgreedBox.classList.remove('hidden');
  } else {
    const noticePeerDisagreedBox = document.getElementById(
      'notice-peer-disagreed'
    );
    noticePeerDisagreedBox.classList.remove('hidden');
  }
}

/**
 * Process options change to send to peer
 * @param {{speed: string, winningScore: number}} options
 */
function askOptionsChangeSendToPeer(options) {
  const optionsChangeBox = document.getElementById('options-change-to-send');
  if (options.speed) {
    optionsChangeBox.textContent =
      document.getElementById('speed-submenu-btn').textContent.trim() + ' ';
    switch (options.speed) {
      case 'slow':
        optionsChangeBox.textContent += document
          .getElementById('slow-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 'medium':
        optionsChangeBox.textContent += document
          .getElementById('medium-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 'fast':
        optionsChangeBox.textContent += document
          .getElementById('fast-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
    }
  } else if (options.winningScore) {
    optionsChangeBox.textContent =
      document.getElementById('winning-score-submenu-btn').textContent.trim() +
      ' ';
    switch (options.winningScore) {
      case 5:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-5-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 10:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-10-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 15:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-15-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
    }
  } else {
    return;
  }
  pendingOptions.toSend = options;
  document
    .getElementById('ask-options-change-send-to-peer')
    .classList.remove('hidden');
  disableOptionsBtn();
}

/**
 * Process options change received from peer
 * @param {{speed: string, winningScore: number}} options
 */
export function askOptionsChangeReceivedFromPeer(options) {
  const optionsChangeBox = document.getElementById('options-change-received');
  if (options.speed) {
    optionsChangeBox.textContent =
      document.getElementById('speed-submenu-btn').textContent.trim() + ' ';
    switch (options.speed) {
      case 'slow':
        optionsChangeBox.textContent += document
          .getElementById('slow-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 'medium':
        optionsChangeBox.textContent += document
          .getElementById('medium-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 'fast':
        optionsChangeBox.textContent += document
          .getElementById('fast-speed-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
    }
  } else if (options.winningScore) {
    optionsChangeBox.textContent =
      document.getElementById('winning-score-submenu-btn').textContent.trim() +
      ' ';
    switch (options.winningScore) {
      case 5:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-5-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 10:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-10-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
      case 15:
        optionsChangeBox.textContent += document
          .getElementById('winning-score-15-btn')
          .textContent.replace('\u2713', '')
          .trim();
        break;
    }
  } else {
    return;
  }
  pendingOptions.received = options;
  document
    .getElementById('ask-options-change-received-from-peer')
    .classList.remove('hidden');
  disableOptionsBtn();
  hideSubmenus();
  hideDropdownsExcept('');
}

export function noticeDisconnected() {
  document.getElementById('notice-disconnected').classList.remove('hidden');
}

export function askOneMoreGame() {
  document.getElementById('ask-one-more-game').classList.remove('hidden');
}

export function enableChatOpenBtn() {
  // @ts-ignore
  chatOpenBtn.disabled = false;
}

export function enableOptionsBtn() {
  const optionsDropdownBtn = document.getElementById('options-dropdown-btn');
  // @ts-ignore
  optionsDropdownBtn.disabled = false;
}

function disableOptionsBtn() {
  const optionsDropdownBtn = document.getElementById('options-dropdown-btn');
  // @ts-ignore
  optionsDropdownBtn.disabled = true;
}

function disableChatBtns() {
  // @ts-ignore
  chatInput.disabled = true;
  // @ts-ignore
  chatOpenBtn.disabled = true;
  // @ts-ignore
  sendBtn.disabled = true;
}

function chatOpenBtnClicked() {
  // @ts-ignore
  chatOpenBtn.disabled = true;
  // @ts-ignore
  chatInput.disabled = false;
  // @ts-ignore
  sendBtn.disabled = false;
  myKeyboard.unsubscribe();
  if (!chatOpenBtn.classList.contains('hidden')) {
    chatOpenBtn.classList.add('hidden');
  }
  chatInputAndSendBtnContainer.classList.remove('hidden');
  chatInput.focus({ preventScroll: true });
}

function sendBtnClicked() {
  disableChatBtns();
  myKeyboard.subscribe();
  if (!chatInputAndSendBtnContainer.classList.contains('hidden')) {
    chatInputAndSendBtnContainer.classList.add('hidden');
  }
  chatOpenBtn.classList.remove('hidden');
  // @ts-ignore
  const message = chatInput.value;
  if (message === '') {
    enableChatOpenBtn();
    return;
  }
  // @ts-ignore
  chatInput.value = '';
  sendChatMessageToPeer(message);
}

/**
 * Attch event listner to the hide btn
 * @param {string} btnId
 * @param {string} boxIdToHide
 */
function attachEventListenerToHideBtn(btnId, boxIdToHide) {
  const btn = document.getElementById(btnId);
  btn.addEventListener('click', () => {
    const box = document.getElementById(boxIdToHide);
    if (!box.classList.contains('hidden')) {
      box.classList.add('hidden');
    }
  });
}

function setUpOptionsBtn(pikaVolley) {
  const optionsDropdownBtn = document.getElementById('options-dropdown-btn');
  const bgmOnBtn = document.getElementById('bgm-on-btn');
  const bgmOffBtn = document.getElementById('bgm-off-btn');
  bgmOnBtn.addEventListener('click', () => {
    bgmOffBtn.classList.remove('selected');
    bgmOnBtn.classList.add('selected');
    pikaVolley.audio.turnBGMVolume(true);
  });
  bgmOffBtn.addEventListener('click', () => {
    bgmOnBtn.classList.remove('selected');
    bgmOffBtn.classList.add('selected');
    pikaVolley.audio.turnBGMVolume(false);
  });

  const stereoBtn = document.getElementById('stereo-btn');
  const monoBtn = document.getElementById('mono-btn');
  const sfxOffBtn = document.getElementById('sfx-off-btn');
  stereoBtn.addEventListener('click', () => {
    monoBtn.classList.remove('selected');
    sfxOffBtn.classList.remove('selected');
    stereoBtn.classList.add('selected');
    pikaVolley.audio.turnSFXVolume(true);
    pikaVolley.isStereoSound = true;
  });
  monoBtn.addEventListener('click', () => {
    sfxOffBtn.classList.remove('selected');
    stereoBtn.classList.remove('selected');
    monoBtn.classList.add('selected');
    pikaVolley.audio.turnSFXVolume(true);
    pikaVolley.isStereoSound = false;
  });
  sfxOffBtn.addEventListener('click', () => {
    stereoBtn.classList.remove('selected');
    monoBtn.classList.remove('selected');
    sfxOffBtn.classList.add('selected');
    pikaVolley.audio.turnSFXVolume(false);
  });

  function isGameInProgress(pikaVolley) {
    return (
      pikaVolley.state !== pikaVolley.intro &&
      pikaVolley.state !== pikaVolley.menu &&
      !(pikaVolley.state === pikaVolley.round && pikaVolley.gameEnded)
    );
  }

  // Game speed:
  //   slow: 1 frame per 50ms = 20 FPS
  //   medium: 1 frame per 40ms = 25 FPS
  //   fast: 1 frame per 33ms = 30.303030... FPS
  const slowSpeedBtn = document.getElementById('slow-speed-btn');
  const mediumSpeedBtn = document.getElementById('medium-speed-btn');
  const fastSpeedBtn = document.getElementById('fast-speed-btn');
  const noticeBoxGameInProgressForSpeed = document.getElementById(
    'notice-speed-options-cannot-changed-if-game-in-progress'
  );
  const noticeBoxGameInProgressForSpeedOKBtn = document.getElementById(
    'notice-speed-options-cannot-changed-if-game-in-progress-ok-btn'
  );
  slowSpeedBtn.addEventListener('click', () => {
    if (slowSpeedBtn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress(pikaVolley)) {
      noticeBoxGameInProgressForSpeed.classList.remove('hidden');
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      return;
    }
    askOptionsChangeSendToPeer({ speed: 'slow', winningScore: null });
  });
  mediumSpeedBtn.addEventListener('click', () => {
    if (mediumSpeedBtn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress(pikaVolley)) {
      noticeBoxGameInProgressForSpeed.classList.remove('hidden');
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      return;
    }
    askOptionsChangeSendToPeer({ speed: 'medium', winningScore: null });
  });
  fastSpeedBtn.addEventListener('click', () => {
    if (fastSpeedBtn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress(pikaVolley)) {
      noticeBoxGameInProgressForSpeed.classList.remove('hidden');
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      return;
    }
    askOptionsChangeSendToPeer({ speed: 'fast', winningScore: null });
  });
  noticeBoxGameInProgressForSpeedOKBtn.addEventListener('click', () => {
    if (!noticeBoxGameInProgressForSpeed.classList.contains('hidden')) {
      noticeBoxGameInProgressForSpeed.classList.add('hidden');
      // @ts-ignore
      optionsDropdownBtn.disabled = false;
    }
  });

  const winningScore5Btn = document.getElementById('winning-score-5-btn');
  const winningScore10Btn = document.getElementById('winning-score-10-btn');
  const winningScore15Btn = document.getElementById('winning-score-15-btn');
  const noticeBoxGameInProgressForWinningScore = document.getElementById(
    'notice-winning-score-options-cannot-changed-if-game-in-progress'
  );
  const noticeBoxGameInProgressForWinningScoreOKBtn = document.getElementById(
    'notice-winning-score-options-cannot-changed-if-game-in-progress-ok-btn'
  );

  // const noticeBox2 = document.getElementById('notice-box-2');
  // const noticeOKBtn2 = document.getElementById('notice-ok-btn-2');
  winningScore5Btn.addEventListener('click', () => {
    if (winningScore5Btn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress(pikaVolley)) {
      noticeBoxGameInProgressForWinningScore.classList.remove('hidden');
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      return;
    }
    askOptionsChangeSendToPeer({ speed: null, winningScore: 5 });
  });
  winningScore10Btn.addEventListener('click', () => {
    if (winningScore10Btn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress(pikaVolley)) {
      noticeBoxGameInProgressForWinningScore.classList.remove('hidden');
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      return;
    }
    askOptionsChangeSendToPeer({ speed: null, winningScore: 10 });
  });
  winningScore15Btn.addEventListener('click', () => {
    if (winningScore15Btn.classList.contains('selected')) {
      return;
    }
    if (isGameInProgress(pikaVolley)) {
      noticeBoxGameInProgressForWinningScore.classList.remove('hidden');
      // @ts-ignore
      optionsDropdownBtn.disabled = true;
      return;
    }
    askOptionsChangeSendToPeer({ speed: null, winningScore: 15 });
  });
  noticeBoxGameInProgressForWinningScoreOKBtn.addEventListener('click', () => {
    if (!noticeBoxGameInProgressForWinningScore.classList.contains('hidden')) {
      noticeBoxGameInProgressForWinningScore.classList.add('hidden');
      // @ts-ignore
      optionsDropdownBtn.disabled = false;
    }
  });
}

/**
 * Attach event listeners to show dropdowns and submenus properly
 */
function setUpToShowDropdownsAndSubmenus() {
  // hide dropdowns and submenus if the user clicks outside of these
  window.addEventListener('click', (event) => {
    // @ts-ignore
    if (!event.target.matches('.dropdown-btn, .submenu-btn')) {
      hideSubmenus();
      hideDropdownsExcept('');
    }
  });

  // set up to show dropdowns
  document
    .getElementById('options-dropdown-btn')
    .addEventListener('click', () => {
      toggleDropdown('options-dropdown');
    });

  // set up to show submenus on mouseover event
  document
    .getElementById('bgm-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('bgm-submenu-btn', 'bgm-submenu');
    });
  document
    .getElementById('sfx-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('sfx-submenu-btn', 'sfx-submenu');
    });
  document
    .getElementById('speed-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('speed-submenu-btn', 'speed-submenu');
    });
  document
    .getElementById('winning-score-submenu-btn')
    .addEventListener('mouseover', () => {
      showSubmenu('winning-score-submenu-btn', 'winning-score-submenu');
    });

  // set up to show submenus on click event
  // (it is for touch device equipped with physical keyboard)
  document.getElementById('bgm-submenu-btn').addEventListener('click', () => {
    showSubmenu('bgm-submenu-btn', 'bgm-submenu');
  });
  document.getElementById('sfx-submenu-btn').addEventListener('click', () => {
    showSubmenu('sfx-submenu-btn', 'sfx-submenu');
  });
  document.getElementById('speed-submenu-btn').addEventListener('click', () => {
    showSubmenu('speed-submenu-btn', 'speed-submenu');
  });
  document
    .getElementById('winning-score-submenu-btn')
    .addEventListener('click', () => {
      showSubmenu('winning-score-submenu-btn', 'winning-score-submenu');
    });
}

/**
 * Toggle (show or hide) the dropdown menu
 * @param {string} dropdownID html element id of the dropdown to toggle
 */
function toggleDropdown(dropdownID) {
  hideSubmenus();
  hideDropdownsExcept(dropdownID);
  document.getElementById(dropdownID).classList.toggle('show');
}

/**
 * Show the submenu
 * @param {string} submenuBtnID html element id of the submenu button whose submenu to show
 * @param {string} subMenuID html element id of the submenu to show
 */
function showSubmenu(submenuBtnID, subMenuID) {
  hideSubmenus();
  document.getElementById(submenuBtnID).classList.add('open');
  document.getElementById(subMenuID).classList.add('show');
}

/**
 * Hide all other dropdowns except the dropdown
 * @param {string} dropdownID html element id of the dropdown
 */
function hideDropdownsExcept(dropdownID) {
  const dropdowns = document.getElementsByClassName('dropdown');
  for (let i = 0; i < dropdowns.length; i++) {
    if (dropdowns[i].id !== dropdownID) {
      dropdowns[i].classList.remove('show');
    }
  }
}

/**
 * Hide all submenus
 */
function hideSubmenus() {
  const submenus = document.getElementsByClassName('submenu');
  for (let i = 0; i < submenus.length; i++) {
    submenus[i].classList.remove('show');
  }
  const submenuBtns = document.getElementsByClassName('submenu-btn');
  for (let i = 0; i < submenuBtns.length; i++) {
    submenuBtns[i].classList.remove('open');
  }
}
