// src/events/EventEmitter.js

/**
 * @class EventEmitter
 * @classdesc A simple event emitter implementation for managing event listeners and emitting events.
 */
export class EventEmitter {
    /**
     * Creates an instance of EventEmitter.
     */
    constructor() {
        /**
         * @private
         * @type {Map<string, Set<Function>>}
         * @description Maps event names to their respective sets of listener functions.
         */
        this.listeners = new Map();

        // Bind methods to ensure correct 'this' context
        this.on = this.on.bind(this);
        this.off = this.off.bind(this);
        this.once = this.once.bind(this);
        this.emit = this.emit.bind(this);
        this.removeAllListeners = this.removeAllListeners.bind(this);
    }

    /**
     * Adds an event listener for the specified event.
     *
     * @param {string} eventName - Name of the event to listen for.
     * @param {Function} listener - Callback function to execute when the event occurs.
     * @returns {Function} Unsubscribe function to remove the listener.
     * @throws {TypeError} If eventName is not a string or listener is not a function.
     */
    on(eventName, listener) {
        if (typeof eventName !== 'string') {
            throw new TypeError('Event name must be a string');
        }
        if (typeof listener !== 'function') {
            throw new TypeError('Listener must be a function');
        }

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        this.listeners.get(eventName).add(listener);

        // Return unsubscribe function
        return () => this.off(eventName, listener);
    }

    /**
     * Removes an event listener for the specified event.
     *
     * @param {string} eventName - Name of the event to remove listener from.
     * @param {Function} listener - Callback function to remove.
     * @throws {TypeError} If eventName is not a string or listener is not a function.
     */
    off(eventName, listener) {
        if (typeof eventName !== 'string') {
            throw new TypeError('Event name must be a string');
        }
        if (typeof listener !== 'function') {
            throw new TypeError('Listener must be a function');
        }

        const listeners = this.listeners.get(eventName);
        if (listeners) {
            listeners.delete(listener);

            // Clean up empty listener sets
            if (listeners.size === 0) {
                this.listeners.delete(eventName);
            }
        }
    }

    /**
     * Adds a one-time event listener that removes itself after being called.
     *
     * @param {string} eventName - Name of the event to listen for once.
     * @param {Function} listener - Callback function to execute once.
     * @returns {Function} Unsubscribe function to remove the listener.
     * @throws {TypeError} If eventName is not a string or listener is not a function.
     */
    once(eventName, listener) {
        if (typeof eventName !== 'string') {
            throw new TypeError('Event name must be a string');
        }
        if (typeof listener !== 'function') {
            throw new TypeError('Listener must be a function');
        }

        const onceWrapper = (...args) => {
            this.off(eventName, onceWrapper);
            listener.apply(this, args);
        };

        return this.on(eventName, onceWrapper);
    }

    /**
     * Emits an event with the specified data to all registered listeners.
     *
     * @param {string} eventName - Name of the event to emit.
     * @param {*} data - Data to pass to the event listeners.
     * @returns {boolean} True if the event had listeners, false otherwise.
     * @throws {TypeError} If eventName is not a string.
     * @throws {AggregateError} If one or more listeners throw an error during execution.
     */
    emit(eventName, data) {
        if (typeof eventName !== 'string') {
            throw new TypeError('Event name must be a string');
        }

        const listeners = this.listeners.get(eventName);
        if (!listeners) {
            return false;
        }

        const errors = [];
        listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                errors.push(error);
            }
        });

        if (errors.length > 0) {
            throw new AggregateError(errors, `Error(s) occurred while emitting "${eventName}" event`);
        }

        return true;
    }

    /**
     * Removes all listeners for a specific event or all events.
     *
     * @param {string} [eventName] - Optional event name. If not provided, removes all listeners.
     * @throws {TypeError} If eventName is provided but is not a string.
     */
    removeAllListeners(eventName) {
        if (eventName === undefined) {
            this.listeners.clear();
        } else if (typeof eventName === 'string') {
            this.listeners.delete(eventName);
        } else {
            throw new TypeError('Event name must be a string or undefined');
        }
    }

    /**
     * Gets the number of listeners for a specific event.
     *
     * @param {string} eventName - Name of the event to count listeners for.
     * @returns {number} Number of listeners for the event.
     * @throws {TypeError} If eventName is not a string.
     */
    listenerCount(eventName) {
        if (typeof eventName !== 'string') {
            throw new TypeError('Event name must be a string');
        }

        const listeners = this.listeners.get(eventName);
        return listeners ? listeners.size : 0;
    }

    /**
     * Gets all registered event names.
     *
     * @returns {string[]} Array of event names.
     */
    eventNames() {
        return Array.from(this.listeners.keys());
    }

    /**
     * Gets all listeners for a specific event.
     *
     * @param {string} eventName - Name of the event to get listeners for.
     * @returns {Function[]} Array of listener functions.
     * @throws {TypeError} If eventName is not a string.
     */
    listeners(eventName) {
        if (typeof eventName !== 'string') {
            throw new TypeError('Event name must be a string');
        }

        const listeners = this.listeners.get(eventName);
        return listeners ? Array.from(listeners) : [];
    }
}