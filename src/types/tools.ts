// src/types/tools.ts

/**
 * Schema definition for tool parameters
 */
export interface ToolSchema {
    type: string;
    properties: Record<string, SchemaProperty>;
    required?: string[];
}

/**
 * Property definition in a tool schema
 */
export interface SchemaProperty {
    type: string;
    description: string;
    items?: SchemaProperty;
    properties?: Record<string, SchemaProperty>;
    required?: string[];
    enum?: string[];
}

/**
 * Tool definition
 */
export interface Tool {
    name: string;
    description: string;
    inputSchema: ToolSchema;
}

/**
 * Tool result content item
 */
export interface ToolResultContent {
    type: string;
    text: string;
}

/**
 * Tool result structure
 */
export interface ToolResult<T = any> {
    isError: boolean;
    content: ToolResultContent[];
    data?: T;
    actionTaken?: string;
    timestamp: string;
    suggestions?: string[];
    recoverySteps?: string[];
}

/**
 * Response from a tool operation
 */
export interface ToolResponse<T = any> {
    toolResult: ToolResult<T>;
}

export interface ToolCallRequest {
    params: {
        name: string;
        arguments?: Record<string, any>;
    };
}

export interface ToolResultContent {
    type: string;
    text: string;
}

export interface ToolResult<T = any> {
    isError: boolean;
    content: ToolResultContent[];
    data?: T;
    actionTaken?: string;
    timestamp: string;
    suggestions?: string[];
    recoverySteps?: string[];
}

export interface ToolResponse<T = any> {
    toolResult: ToolResult<T>;
}

export interface ToolResponseOptions<T = any> {
    data?: T;
    message?: string;
    actionTaken?: string;
    suggestions?: string[];
}

export interface ToolErrorOptions {
    operation: string;
    error: string;
    context?: Record<string, any>;
    suggestions?: string[];
    recoverySteps?: string[];
}

export interface PartialSuccessOptions<T = any> {
    operation: string;
    attempted: T[];
    succeeded: T[];
    failed: T[];
    details: Record<string, string>;
}

export interface ToolCallRequest {
    params: {
        name: string;
        arguments?: Record<string, any>;
    };
}