// src/utils/responseFormatter.ts

import type {
    ToolResponse,
    ToolResult,
    ToolResponseOptions,
    ToolErrorOptions,
    PartialSuccessOptions
} from '../types/tools.ts';

/**
 * Formats successful tool responses in a consistent, AI-friendly way.
 */
export function formatToolResponse<T = any>({
                                                data,
                                                message,
                                                actionTaken,
                                                suggestions = []
                                            }: ToolResponseOptions<T>): ToolResponse<T> {
    const toolResult: ToolResult<T> = {
        isError: false,
        content: message ? [{type: "text", text: message}] : [],
        timestamp: new Date().toISOString()
    };

    if (data !== undefined) {
        toolResult.data = data;
    }

    if (actionTaken) {
        toolResult.actionTaken = actionTaken;
    }

    if (suggestions.length > 0) {
        toolResult.suggestions = suggestions;
    }

    return {toolResult};
}

/**
 * Formats error responses with detailed context for AI understanding.
 */
export function formatToolError({
                                    operation,
                                    error,
                                    context,
                                    suggestions = [],
                                    recoverySteps = []
                                }: ToolErrorOptions): ToolResponse {
    const toolResult: ToolResult = {
        isError: true,
        content: [
            {type: "text", text: `Error during ${operation}: ${error}`},
            ...(context ? [{type: "text", text: `Context: ${JSON.stringify(context)}`}] : [])
        ],
        timestamp: new Date().toISOString()
    };

    if (suggestions.length > 0) {
        toolResult.suggestions = suggestions;
    }

    if (recoverySteps.length > 0) {
        toolResult.recoverySteps = recoverySteps;
    }

    return {toolResult};
}

/**
 * Validates tool input parameters against a schema with helpful feedback.
 */
export function validateToolInput(params: Record<string, any>, schema: any) {
    const validationResult = {
        isValid: true,
        content: [] as Array<{ type: string; text: string }>
    };

    // Required fields check
    schema.required?.forEach((field: string) => {
        if (!(field in params)) {
            validationResult.isValid = false;
            validationResult.content.push({type: "text", text: `Missing required field: ${field}`});
        }
    });

    // Type validation
    Object.entries(schema.properties).forEach(([field, config]: [string, any]) => {
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
            }
        }
    });

    return validationResult;
}

/**
 * Creates an informative message for partial success scenarios.
 */
export function formatPartialSuccess<T>({
                                            operation,
                                            attempted,
                                            succeeded,
                                            failed,
                                            details
                                        }: PartialSuccessOptions<T>): ToolResponse {
    const toolResult: ToolResult = {
        isError: true,
        content: [
            {
                type: "text",
                text: `Partial success for ${operation}: ${succeeded.length} succeeded, ${failed.length} failed`
            },
            {
                type: "text",
                text: `Details: ${JSON.stringify(details)}`
            }
        ],
        data: {
            succeededItems: succeeded,
            failedItems: failed.map(item => ({
                item,
                reason: details[String(item)] || 'Unknown error'
            }))
        },
        suggestions: [
            "Review failed items and their reasons",
            "Consider retrying failed operations individually",
            "Verify requirements for failed items"
        ],
        timestamp: new Date().toISOString()
    };

    return {toolResult};
}