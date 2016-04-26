import Ember from 'ember';
const { getOwner } = Ember;

export default Ember.Service.extend({
  client: null,
  config: null,
  subscriptions: {},
  online: false,
  offline: Ember.computed.not('online'),

  init() {
    Ember.Logger.debug('Initializing Ember Faye service...');
    this._super(...arguments);
    let config = (getOwner(this).resolveRegistration('config:environment') || {}).faye || {};
    this.set('config', config);

    this.setupServiceClient();
  },

  createClient() {
    let config = this.get('config');
    let client = new Faye.Client(config.URL, config.options);

    if (config.disable) {
      Ember.forEach(config.disable, function(transport) {
        client.disable(transport);
      });
    }

    return client;
  },

  setupServiceClient(client = null) {
    if (!client) {
      client = this.createClient();
    }

    client.on('transport:up', () => {
      this.set('online', true);
    });

    client.on('transport:down', () => {
      this.set('online', false);
    });
    this.set('client', client);
  },

  publish(channel, payload, options = {}) {
    return this.get('client').publish(channel, payload, options);
  },

  subscribe(channel, callback, binding) {
    if (!binding) {
      binding = this;
    }

    let bindCallback = callback.bind(binding);

    console.debug(`Subscribing to ${channel}...`);
    let subscription = this.get('client').subscribe(
      channel,
      (message) => {
        bindCallback(message, channel);
      }
    ).then(() => {
      console.debug(`Subscribed to ${channel}.`);
    });

    let subscriptions = this.get('subscriptions');
    if (!subscriptions[channel]) {
      subscriptions[channel] = [];
    }
    subscriptions[channel].push(subscription);
    this.set('subscriptions', subscriptions);

    return subscription;
  }
});