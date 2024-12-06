// src/managers/interfaces/IManager.js
import {EventEmitter} from '../../events/EventEmitter.js';

/**
 * @class IManager
 * @extends EventEmitter
 * @classdesc Abstract base class for all manager interfaces. Provides event emission capabilities and enforces the implementation of the `initialize` method.
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
     * Initializes the manager. Must be implemented by subclasses.
     *
     * @returns {Promise<void>}
     * @throws {Error} Method not implemented.
     */
    async initialize() {
        throw new Error('Method not implemented');
    }
}
