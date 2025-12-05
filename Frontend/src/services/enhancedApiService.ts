// 🌐 Enhanced API Service with Retry Logic & Better Error Handling
// Wraps fetch with platform-specific optimizations and robust error handling

import { Platform } from 'react-native';

export interface RetryOptions {
    maxRetries?: number;
    retryDelay?: number; // Initial delay in ms
    retryOn?: number[]; // HTTP status codes to retry on
    exponentialBackoff?: boolean;
    timeout?: number; // Request timeout in ms
}

export interface RequestOptions extends RequestInit {
    retry?: RetryOptions;
    skipRetryOnError?: boolean;
}

/**
 * Check network connectivity
 * Simple implementation without external dependencies
 */
export const isNetworkAvailable = async (): Promise<boolean> => {
    try {
        // Try to fetch a lightweight resource with short timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return true;
    } catch (error) {
        console.warn('Network check failed, assuming connected:', error);
        return true; // Assume connected if check fails to avoid blocking
    }
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Calculate retry delay with exponential backoff
 */
const getRetryDelay = (
    attempt: number,
    baseDelay: number,
    exponential: boolean
): number => {
    if (!exponential) return baseDelay;
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000); //Cap at 30s
};

/**
 * Enhanced fetch with timeout
 */
const fetchWithTimeout = async (
    url: string,
    options: RequestInit = {},
    timeout: number = 30000
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
    }
};

/**
 * Enhanced request with retry logic
 */
export const enhancedFetch = async (
    url: string,
    options: RequestOptions = {}
): Promise<Response> => {
    const {
        retry = {},
        skipRetryOnError = false,
        ...fetchOptions
    } = options;

    const {
        maxRetries = 3,
        retryDelay = 1000,
        retryOn = [408, 429, 500, 502, 503, 504],
        exponentialBackoff = true,
        timeout = 30000,
    } = retry;

    let lastError: Error | null = null;
    let lastResponse: Response | null = null;

    // Check network before attempting
    const networkAvailable = await isNetworkAvailable();
    if (!networkAvailable) {
        throw new Error('No internet connection. Please check your network settings.');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Request attempt ${attempt}/${maxRetries}: ${url}`);

            const response = await fetchWithTimeout(url, fetchOptions, timeout);

            // If successful or should not retry, return
            if (response.ok || (response.status < 500 && !retryOn.includes(response.status))) {
                console.log(`✅ Request successful on attempt ${attempt}`);
                return response;
            }

            // Store response for potential return if all retries fail
            lastResponse = response;

            // Check if we should retry based on status code
            if (!retryOn.includes(response.status)) {
                console.log(`⚠️ Status ${response.status} not retriable, returning response`);
                return response;
            }

            console.warn(`⚠️ Attempt ${attempt} failed with status ${response.status}`);

            // If we have more retries, wait before next attempt
            if (attempt < maxRetries) {
                const delay = getRetryDelay(attempt, retryDelay, exponentialBackoff);
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await sleep(delay);
            }
        } catch (error) {
            lastError = error as Error;
            console.error(`❌ Attempt ${attempt} error:`, error);

            // Don't retry on certain errors
            if (skipRetryOnError || error instanceof TypeError) {
                // Network errors, type errors shouldn't be retried
                throw error;
            }

            // If we have more retries, wait before next attempt
            if (attempt < maxRetries) {
                const delay = getRetryDelay(attempt, retryDelay, exponentialBackoff);
                console.log(`⏳ Waiting ${delay}ms before retry...`);
                await sleep(delay);
            }
        }
    }

    // All retries exhausted
    if (lastResponse) {
        console.warn(`⚠️ All ${maxRetries} attempts failed, returning last response`);
        return lastResponse;
    }

    throw lastError || new Error(`Request failed after ${maxRetries} attempts`);
};

/**
 * API Error class
 */
export class APIError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public response?: any
    ) {
        super(message);
        this.name = 'APIError';
    }
}

/**
 * Parse error response
 */
export const parseErrorResponse = async (response: Response): Promise<string> => {
    try {
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
            const data = await response.json();

            // Handle FastAPI validation errors  
            if (response.status === 422 && data?.detail) {
                if (Array.isArray(data.detail)) {
                    const errors = data.detail.map((err: any) => {
                        const field = err.loc ? err.loc.join('.') : 'unknown';
                        return `${field}: ${err.msg}`;
                    }).join(', ');
                    return `Validation Error: ${errors}`;
                } else if (typeof data.detail === 'string') {
                    return data.detail;
                }
            }

            // Standard error message
            return data?.detail || data?.message || `HTTP ${response.status}: ${response.statusText}`;
        } else {
            // Non-JSON response
            const text = await response.text();
            return text || `HTTP ${response.status}: ${response.statusText}`;
        }
    } catch (error) {
        console.warn('Failed to parse error response:', error);
        return `HTTP ${response.status}: ${response.statusText}`;
    }
};

/**
 * Enhanced request wrapper with automatic error parsing
 */
export const apiRequest = async <T = any>(
    url: string,
    options: RequestOptions = {}
): Promise<T> => {
    try {
        const response = await enhancedFetch(url, options);

        // Parse response
        const contentType = response.headers.get('content-type');
        let data: any;

        if (contentType?.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        // Handle error responses
        if (!response.ok) {
            const errorMessage = await parseErrorResponse(response);
            throw new APIError(errorMessage, response.status, data);
        }

        return data as T;
    } catch (error) {
        // Re-throw APIError as is
        if (error instanceof APIError) {
            throw error;
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('Network request failed')) {
            throw new Error('Unable to connect to server. Please check your internet connection and try again.');
        }

        // Handle timeout errors
        if (error instanceof Error && error.message.includes('timeout')) {
            throw new Error('Request timed out. Please check your connection and try again.');
        }

        // Generic error
        throw error;
    }
};

/**
 * Platform-specific request headers
 */
export const getPlatformHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => {
    return {
        'User-Agent': Platform.OS === 'ios'
            ? 'EmployeeApp-iOS/1.0'
            : 'EmployeeApp-Android/1.0',
        'X-Platform': Platform.OS,
        'X-Platform-Version': Platform.Version.toString(),
        ...additionalHeaders,
    };
};

/**
 * Create authenticated request options
 */
export const createAuthRequest = (
    token: string,
    method: string = 'GET',
    body?: any,
    additionalHeaders: Record<string, string> = {}
): RequestOptions => {
    const options: RequestOptions = {
        method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...getPlatformHeaders(additionalHeaders),
        },
        retry: {
            maxRetries: 3,
            retryDelay: 1000,
            exponentialBackoff: true,
            timeout: 30000,
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    return options;
};

/**
 * Create FormData request options (for file uploads)
 */
export const createFormDataRequest = (
    token: string,
    formData: FormData,
    additionalHeaders: Record<string, string> = {}
): RequestOptions => {
    return {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...getPlatformHeaders(additionalHeaders),
            // Don't set Content-Type for FormData, let browser/platform set it with boundary
        },
        body: formData,
        retry: {
            maxRetries: 2, // Fewer retries for uploads
            retryDelay: 2000,
            exponentialBackoff: true,
            timeout: 60000, // Longer timeout for uploads
        },
    };
};

/**
 * Batch request handler
 * Useful for making multiple requests in parallel
 */
export const batchRequests = async <T = any>(
    requests: Array<{ url: string; options?: RequestOptions }>,
    maxConcurrent: number = 5
): Promise<T[]> => {
    const results: T[] = [];
    const errors: Error[] = [];

    // Process in batches
    for (let i = 0; i < requests.length; i += maxConcurrent) {
        const batch = requests.slice(i, i + maxConcurrent);

        const batchResults = await Promise.allSettled(
            batch.map(req => apiRequest<T>(req.url, req.options))
        );

        batchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                errors.push(result.reason);
                console.error(`Batch request ${i + index} failed:`, result.reason);
            }
        });
    }

    if (errors.length > 0 && results.length === 0) {
        throw new Error(`All batch requests failed. First error: ${errors[0].message}`);
    }

    return results;
};

/**
 * Request debouncer
 * Prevents duplicate requests to the same endpoint
 */
const pendingRequests = new Map<string, Promise<any>>();

export const debouncedRequest = async <T = any>(
    key: string,
    requestFn: () => Promise<T>
): Promise<T> => {
    // If request is already in progress, return the pending promise
    if (pendingRequests.has(key)) {
        console.log(`⏸️ Using cached promise for: ${key}`);
        return pendingRequests.get(key)!;
    }

    // Start new request
    const promise = requestFn().finally(() => {
        // Clean up after request completes
        pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise;
};

/**
 * Health check utility
 */
export const checkAPIHealth = async (baseUrl: string): Promise<boolean> => {
    try {
        const response = await enhancedFetch(`${baseUrl}/test-cors`, {
            retry: {
                maxRetries: 1,
                timeout: 5000,
            },
        });
        return response.ok;
    } catch (error) {
        console.error('API health check failed:', error);
        return false;
    }
};

export default {
    enhancedFetch,
    apiRequest,
    isNetworkAvailable,
    parseErrorResponse,
    getPlatformHeaders,
    createAuthRequest,
    createFormDataRequest,
    batchRequests,
    debouncedRequest,
    checkAPIHealth,
    APIError,
};
