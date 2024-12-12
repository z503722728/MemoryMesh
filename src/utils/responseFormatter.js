// src/utils/responseFormatter.js
import {ErrorCode} from "@modelcontextprotocol/sdk/types.js";

/**
 * Formats successful tool responses in a consistent, AI-friendly way.
 *
 * @param {Object} options - Options for formatting the response.
 * @param {any} options.data - The data returned by the tool operation.
 * @param {string} [options.message] - A human-readable message describing the result.
 * @param {string} [options.actionTaken] - A description of the action taken by the tool.
 * @returns {Object} - The formatted tool response object.
 */
export function formatToolResponse({data, message, actionTaken}) {
    return {
        toolResult: {
            isError: false,
            content: message ? [{type: "text", text: message}] : [],
            data,
            ...(actionTaken && {actionTaken}),
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Formats error responses with detailed context for AI understanding.
 *
 * @param {Object} options - Options for formatting the error response.
 * @param {string} options.operation - The name of the operation that resulted in an error.
 * @param {string} options.error - The error message or description.
 * @param {Object} [options.context] - Additional context information about the error.
 * @param {string[]} [options.suggestions] - Suggestions for the AI to potentially correct the error.
 * @param {string[]} [options.recoverySteps] - Specific steps the AI might take to recover from the error.
 * @returns {Object} - The formatted tool error response object.
 */
export function formatToolError({
                                    operation,
                                    error,
                                    context,
                                    suggestions = [],
                                    recoverySteps = []
                                }) {
    return {
        toolResult: {
            isError: true,
            content: [
                {type: "text", text: `Error during ${operation}: ${error}`},
                ...(context ? [{type: "text", text: `Context: ${JSON.stringify(context)}`}] : []),
                ...(suggestions.length > 0 ? [{type: "text", text: `Suggestions: ${suggestions.join(', ')}`}] : []),
                ...(recoverySteps.length > 0 ? [{
                    type: "text",
                    text: `Recovery Steps: ${recoverySteps.join(', ')}`
                }] : [])
            ],
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Validates tool input parameters against a schema with helpful feedback.
 *
 * @param {Object} params - The input parameters to validate.
 * @param {Object} schema - The schema defining the expected structure and types of the parameters.
 * @returns {Object} - The validation result, including whether the input is valid, any errors, and suggestions.
 */
export function validateToolInput(params, schema) {
    const validationResult = {
        isValid: true,
        content: []
    };

    // Required fields check
    schema.required?.forEach(field => {
        if (!(field in params)) {
            validationResult.isValid = false;
            validationResult.content.push({type: "text", text: `Missing required field: ${field}`});
        }
    });

    // Type validation
    Object.entries(schema.properties).forEach(([field, config]) => {
        if (field in params) {
            const value = params[field];
            if (config.type === 'object' && config.properties) {
                const nestedValidation = validateToolInput(value, config);
                if (!nestedValidation.isValid) {
                    validationResult.isValid = false;
                    validationResult.content.push(...nestedValidation.content.map(item => ({
                        ...item,
                        text: `${field}.${item.text}`
                    })));
                }
            } else if (config.type === 'array' && config.items && config.items.type === 'object' && config.items.properties) {
                if (!Array.isArray(value)) {
                    validationResult.isValid = false;
                    validationResult.content.push({type: "text", text: `${field} must be an array`});
                } else {
                    value.forEach((item, index) => {
                        const nestedValidation = validateToolInput(item, config.items);
                        if (!nestedValidation.isValid) {
                            validationResult.isValid = false;
                            validationResult.content.push(...nestedValidation.content.map(item => ({
                                ...item,
                                text: `${field}[${index}].${item.text}`
                            })));
                        }
                    });
                }
            } else {
                switch (config.type) {
                    case 'string':
                        if (typeof value !== 'string') {
                            validationResult.isValid = false;
                            validationResult.content.push({type: "text", text: `${field} must be a string`});
                        }
                        break;
                    case 'number':
                        if (typeof value !== 'number') {
                            validationResult.isValid = false;
                            validationResult.content.push({type: "text", text: `${field} must be a number`});
                        }
                        break;
                    case 'array':
                        if (!Array.isArray(value)) {
                            validationResult.isValid = false;
                            validationResult.content.push({type: "text", text: `${field} must be an array`});
                        }
                        break;
                    // Add more type validations as needed
                }
            }
        }
    });

    return validationResult;
}

/**
 * Creates an informative message for partial success scenarios.
 *
 * @param {Object} options - Options for formatting the partial success message.
 * @param {string} options.operation - The name of the operation that was attempted.
 * @param {any[]} options.attempted - The items that were attempted to be processed.
 * @param {any[]} options.succeeded - The items that were successfully processed.
 * @param {any[]} options.failed - The items that failed to be processed.
 * @param {Object} options.details - Details about the successes and failures, keyed by item identifier.
 * @returns {Object} - The formatted partial success response object.
 */
export function formatPartialSuccess({
                                         operation,
                                         attempted,
                                         succeeded,
                                         failed,
                                         details
                                     }) {
    return {
        toolResult: {
            isError: true, // depending on definition of partial success
            content: [
                {
                    type: "text",
                    text: `Partial success for ${operation}: ${succeeded.length} succeeded, ${failed.length} failed`
                },
                {
                    type: "text",
                    text: `Details: ${JSON.stringify(details)}`
                }
                // ... (add more details as needed)
            ],
            data: {
                succeededItems: succeeded,
                failedItems: failed.map(item => ({
                    item,
                    reason: details[item] || 'Unknown error'
                }))
            },
            suggestions: [
                "Review failed items and their reasons",
                "Consider retrying failed operations individually",
                "Verify requirements for failed items"
            ],
            timestamp: new Date().toISOString()
        }
    };
}