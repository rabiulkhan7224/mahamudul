
'use server';
/**
 * @fileOverview A flow to send SMS messages via BulkSMSBD.
 *
 * - sendSms - A function to send an SMS.
 * - SendSmsInput - The input type for the sendSms flow.
 * - SendSmsOutput - The output type for the sendSms flow.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SendSmsInputSchema = z.object({
  apiKey: z.string().describe('The API key for BulkSMSBD.'),
  senderId: z.string().describe('The Sender ID approved by BulkSMSBD.'),
  phoneNumber: z.string().describe('The recipient phone number.'),
  message: z.string().describe('The text message to send.'),
});
export type SendSmsInput = z.infer<typeof SendSmsInputSchema>;

const SendSmsOutputSchema = z.object({
  success: z.boolean().describe('Whether the SMS was sent successfully.'),
  message: z.string().describe('The response message from the API.'),
});
export type SendSmsOutput = z.infer<typeof SendSmsOutputSchema>;


export async function sendSms(input: SendSmsInput): Promise<SendSmsOutput> {
  return sendSmsFlow(input);
}


const sendSmsFlow = ai.defineFlow(
  {
    name: 'sendSmsFlow',
    inputSchema: SendSmsInputSchema,
    outputSchema: SendSmsOutputSchema,
  },
  async (input) => {
    const { apiKey, senderId, phoneNumber, message } = input;
    const url = new URL('https://bulksmsbd.net/api/smsapi');
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('senderid', senderId);
    url.searchParams.append('number', phoneNumber);
    url.searchParams.append('message', message);

    try {
      const response = await fetch(url.toString());
      const responseText = await response.text();

      // Handle JSON response first
      try {
        const jsonResponse = JSON.parse(responseText);
        // The API returns 202 for success.
        if (jsonResponse.response_code === 202) {
          return { success: true, message: jsonResponse.success_message || 'SMS Submitted Successfully.' };
        } else {
          return { success: false, message: jsonResponse.error_message || `API Error: ${jsonResponse.response_code || 'Unknown'}` };
        }
      } catch (e) {
        // Fallback for non-JSON or malformed JSON responses
        // The API documentation also indicates a success code of '1000' in a pipe-separated format.
        if (response.ok && responseText.includes('1000')) {
          const apiMessage = responseText.split('|')[1]?.trim() || 'SMS sent successfully.';
          return { success: true, message: apiMessage };
        } else {
          const errorMessage = responseText.split('|')[1]?.trim() || responseText || `Failed to send SMS. Status: ${response.status}`;
          return { success: false, message: errorMessage };
        }
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      return { success: false, message: error.message || 'An unknown error occurred.' };
    }
  }
);
