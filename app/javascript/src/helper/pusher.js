/* eslint-env browser */
/* eslint no-console: 0 */
import Pusher from 'pusher-js';
import AuthAPI from '../api/auth';
import CONSTANTS from '../constants';

const ding = require('../assets/audio/ding.mp3');

class VuePusher {
  constructor(apiKey, options) {
    this.app = options.app;
    this.pusher = new Pusher(apiKey, options);
    this.channels = [];
  }

  subscribe(channelName) {
    const channel = this.pusher.subscribe(channelName);
    if (!this.channels.includes(channel)) {
      this.channels.push(channelName);
    }
    this.bindEvent(channel);
  }

  unsubscribe(channelName) {
    this.pusher.unsubscribe(channelName);
  }

  // eslint-disable-next-line
  bindEvent(channel) {
    channel.bind('message.created', function messageCreate(data) {
      // Play sound if incoming
      if (!data.message_type) {
        new Audio(ding).play();
      }
      this.app.$store.dispatch('addMessage', data);
    });

    channel.bind('conversation.created', function conversationCreated(data) {
      this.app.$store.dispatch('addConversation', data);
    });

    channel.bind('status_change:conversation', function statusChange(data) {
      this.app.$store.dispatch('addConversation', data);
    });

    channel.bind('assignee.changed', function assigneeChanged(payload) {
      if (!payload.meta) return;
      const { assignee } = payload.meta;
      const { id } = payload;
      if (id) {
        this.app.$store.dispatch('updateAssignee', {
          id,
          assignee,
        });
      }
    });

    channel.bind('user:logout', () => {
      AuthAPI.logout();
    });

    channel.bind('page:reload', () => {
      window.location.reload();
    });
  }
}

/* eslint no-param-reassign: ["error", { "props": false }] */
export default {
  init() {
    // Log only if env is testing or development.
    Pusher.logToConsole = CONSTANTS.PUSHER.logToConsole || true;
    // Init Pusher
    const options = {
      encrypted: true,
      app: window.WOOT,
      cluster: CONSTANTS.PUSHER.cluster,
    };
    const pusher = new VuePusher(CONSTANTS.PUSHER.token, options);
    // Add to global Obj
    if (AuthAPI.isLoggedIn()) {
      pusher.subscribe(AuthAPI.getChannel());
      return pusher.pusher;
    }
    return null;
  },
};
