import {describe, expect, it, vi, beforeAll, beforeEach} from 'vitest';
import {defmulti} from '../../../netlify/shared/multimethod.mjs';

describe('dev email provider', () => {
    let sendNotificationEmail, sendBatchNotificationEmails;

    beforeAll(async () => {
        sendNotificationEmail = defmulti(() => 'dev');
        sendBatchNotificationEmails = defmulti(() => 'dev');

        // Mock the giverNotification imports so dev.mjs can register on our test multimethods
        vi.doMock('../../../netlify/shared/emailDispatch.mjs', () => ({
            sendNotificationEmail,
            sendBatchNotificationEmails,
        }));

        await import('../../../netlify/shared/emailProviders/dev.mjs');
    });

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    describe('sendBatchNotificationEmails', () => {
        it('logs each message', async () => {
            const messages = [{
                to: 'alex@test.com',
                templateName: 'secret-santa',
                subject: 'Your recipient!',
                parameters: {name: 'Alex'},
            }];

            await sendBatchNotificationEmails(messages);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[DEV EMAIL] Template: secret-santa')
            );
        });

        it('returns empty emailsFailed for non-fail.test addresses', async () => {
            const messages = [{
                to: 'alex@test.com', templateName: 'secret-santa',
                subject: 'Test', parameters: {},
            }];

            const result = await sendBatchNotificationEmails(messages);

            expect(result.emailsFailed).toEqual([]);
        });

        it('returns @fail.test addresses in emailsFailed', async () => {
            const messages = [
                {to: 'alex@fail.test', templateName: 'secret-santa', subject: 'Test', parameters: {}},
                {to: 'whitney@test.com', templateName: 'secret-santa', subject: 'Test', parameters: {}},
                {to: 'hunter@fail.test', templateName: 'secret-santa', subject: 'Test', parameters: {}},
            ];

            const result = await sendBatchNotificationEmails(messages);

            expect(result.emailsFailed).toEqual(['alex@fail.test', 'hunter@fail.test']);
        });
    });

    describe('sendNotificationEmail', () => {
        it('logs template, recipient, subject, and parameters', async () => {
            await sendNotificationEmail('wishlist-link', 'alex@test.com', 'Subject', {url: 'http://test'});

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[DEV EMAIL] Template: wishlist-link | To: alex@test.com')
            );
        });

        it('succeeds for non-fail.test addresses', async () => {
            await expect(
                sendNotificationEmail('secret-santa', 'alex@test.com', 'Subject', {})
            ).resolves.toBeUndefined();
        });

        it('throws for @fail.test addresses', async () => {
            await expect(
                sendNotificationEmail('secret-santa', 'alex@fail.test', 'Subject', {})
            ).rejects.toThrow('Simulated email failure');
        });
    });
});
