// src/core/managers/interfaces/IManager.js
import {EventEmitter} from '../../events/EventEmitter.js';

/**
 * @class IManager
 * @extends EventEmitter
 * @classdesc Abstract base class for all manager interfaces. Provides event emission capabilities and implements common initialization.
 */
export class IManager extends EventEmitter {
    /**
     * Creates an instance of IManager.
     *
     * @param {Object} storage - The storage mechanism to use for persisting the knowledge graph.
     * @throws {Error} If attempting to instantiate the abstract class directly.
     */
    constructor(storage) {
        super();
        if (new.target === IManager) {
            throw new Error('IManager is an abstract class');
        }
        /**
         * @protected
         * @type {Object}
         * @description The storage instance used by the manager.
         */
        this.storage = storage;
    }

    /**
     * Initializes the manager by emitting the 'initialized' event.
     * Common implementation for all manager classes.
     *
     * @returns {Promise<void>}
     */
    async initialize() {
        this.emit('initialized', {manager: this.constructor.name});
    }
}