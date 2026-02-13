import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

async function refreshEnv(handler, mockFetch){
    vi.resetModules();
    vi.doMock('node-fetch', () => ({
        default: mockFetch,
    }));
    const module = await import('../../netlify/functions/dispatchEmail.mjs');
    handler = module.handler;

    const giver = {
        name: 'Alex',
        recipient: 'Whitney',
        email: 'alex@test.com',
    };

    const event = {
        body: JSON.stringify(giver),
    };

    await handler(event);
}

describe('dispatchEmail', () => {
    let handler;
    let mockFetch;
    let originalEnv;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(async () => {
        // Mock console to suppress output during tests
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Store original environment
        originalEnv = {...process.env};

        // Set test environment variables
        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret-key';

        // Mock fetch
        mockFetch = vi.fn();

        // Mock node-fetch
        vi.doMock('node-fetch', () => ({
            default: mockFetch,
        }));

        // Reset modules and import
        vi.resetModules();
        const module = await import('../../netlify/functions/dispatchEmail.mjs');
        handler = module.handler;
    });

    afterEach(() => {
        // Restore console
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();

        // Restore environment
        process.env = originalEnv;
        vi.restoreAllMocks();
        vi.resetModules();
    });

    describe('handler', () => {
        it('returns 400 when body is null', async () => {
            const event = {
                body: null,
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(400);
            expect(JSON.parse(response.body)).toBe('Payload required');
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('sends email with correct parameters', async () => {
            mockFetch.mockResolvedValue({ok: true});

            const giver = {
                name: 'Alex',
                recipient: 'Whitney',
                email: 'alex@test.com',
            };

            const event = {
                body: JSON.stringify(giver),
            };

            const response = await handler(event);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://test.netlify.app/.netlify/functions/emails/secret-santa',
                expect.objectContaining({
                    method: 'POST',
                    headers: {
                        'netlify-emails-secret': 'test-secret-key',
                    },
                })
            );

            expect(response.statusCode).toBe(200);
        });

        it('includes correct email details in request body', async () => {
            mockFetch.mockResolvedValue({ok: true});

            const giver = {
                name: 'Alex',
                recipient: 'Whitney',
                email: 'alex@test.com',
            };

            const event = {
                body: JSON.stringify(giver),
            };

            await handler(event);

            const fetchCall = mockFetch.mock.calls[0];
            const requestBody = JSON.parse(fetchCall[1].body);

            expect(requestBody).toEqual({
                from: 'alex@soundrootsproductions.com',
                to: 'alex@test.com',
                subject: 'Your gift exchange recipient name has arrived!',
                parameters: {
                    name: 'Alex',
                    recipient: 'Whitney',
                },
            });
        });

        it('logs giver and recipient names', async () => {
            const consoleSpy = vi.spyOn(console, 'log');
            mockFetch.mockResolvedValue({ok: true});

            const giver = {
                name: 'Hunter',
                recipient: 'Megan',
                email: 'hunter@test.com',
            };

            const event = {
                body: JSON.stringify(giver),
            };

            await handler(event);

            expect(consoleSpy).toHaveBeenCalledWith('giver', 'Hunter');
            expect(consoleSpy).toHaveBeenCalledWith('recipient', 'Megan');
        });

        it('returns 200 after successful email send', async () => {
            mockFetch.mockResolvedValue({ok: true});

            const giver = {
                name: 'Alex',
                recipient: 'Whitney',
                email: 'alex@test.com',
            };

            const event = {
                body: JSON.stringify(giver),
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);
        });

        it('throws error when fetch fails', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const giver = {
                name: 'Alex',
                recipient: 'Whitney',
                email: 'alex@test.com',
            };

            const event = {
                body: JSON.stringify(giver),
            };

            // The function doesn't handle fetch errors, so it should throw
            await expect(handler(event)).rejects.toThrow('Network error');
        });

        it('uses correct URL from environment', async () => {
            mockFetch.mockResolvedValue({ok: true});
            process.env.URL = 'https://custom.domain.com';
            await refreshEnv(handler, mockFetch);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://custom.domain.com/.netlify/functions/emails/secret-santa',
                expect.any(Object)
            );
        });

        it('uses correct secret from environment', async () => {
            mockFetch.mockResolvedValue({ok: true});
            process.env.NETLIFY_EMAILS_SECRET = 'super-secret-key';
            await refreshEnv(handler, mockFetch);

            const fetchCall = mockFetch.mock.calls[0];
            expect(fetchCall[1].headers['netlify-emails-secret']).toBe('super-secret-key');
        });

        it('parses JSON body correctly', async () => {
            mockFetch.mockResolvedValue({ok: true});

            const giver = {
                name: 'Test User',
                recipient: 'Another User',
                email: 'test@example.com',
            };

            const event = {
                body: JSON.stringify(giver),
            };

            await handler(event);

            const fetchCall = mockFetch.mock.calls[0];
            const requestBody = JSON.parse(fetchCall[1].body);

            expect(requestBody.parameters.name).toBe('Test User');
            expect(requestBody.parameters.recipient).toBe('Another User');
        });

        it('handles givers with special characters in names', async () => {
            mockFetch.mockResolvedValue({ok: true});

            const giver = {
                name: "O'Brien",
                recipient: 'José García',
                email: 'obrien@test.com',
            };

            const event = {
                body: JSON.stringify(giver),
            };

            await handler(event);

            const fetchCall = mockFetch.mock.calls[0];
            const requestBody = JSON.parse(fetchCall[1].body);

            expect(requestBody.parameters.name).toBe("O'Brien");
            expect(requestBody.parameters.recipient).toBe('José García');
        });
    });
});
