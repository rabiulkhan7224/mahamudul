
'use server';
/**
 * @fileOverview A flow to check the account balance from BulkSMSBD.
 *
 * - getSmsBalance - A function that returns the account balance.
 * - GetSmsBalanceInput - The input type for the getSmsBalance flow.
 * - GetSmsBalanceOutput - The output type for the getSmsBalance flow.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GetSmsBalanceInputSchema = z.object({
  apiKey: z.string().describe('The API key for BulkSMSBD.'),
});
export type GetSmsBalanceInput = z.infer<typeof GetSmsBalanceInputSchema>;

const GetSmsBalanceOutputSchema = z.string().describe('The account balance as a string (e.g., "৳123.45").');
export type GetSmsBalanceOutput = z.infer<typeof GetSmsBalanceOutputSchema>;

export async function getSmsBalance(input: GetSmsBalanceInput): Promise<GetSmsBalanceOutput> {
  return getSmsBalanceFlow(input);
}

const getSmsBalanceFlow = ai.defineFlow(
  {
    name: 'getSmsBalanceFlow',
    inputSchema: GetSmsBalanceInputSchema,
    outputSchema: GetSmsBalanceOutputSchema,
  },
  async ({ apiKey }) => {
    const url = new URL('https://bulksmsbd.net/api/getBalanceApi');
    url.searchParams.append('api_key', apiKey);

    try {
      const response = await fetch(url.toString());
      const responseText = await response.text();
      
      try {
        // Attempt to parse the response as JSON first.
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.response_code === 202 && jsonResponse.balance !== undefined) {
          const balanceValue = parseFloat(jsonResponse.balance);
          if (!isNaN(balanceValue)) {
            return `৳${balanceValue.toFixed(2)}`;
          }
        }
      } catch (e) {
        // If it's not a JSON object, it might be a plain number (legacy response).
        const balance = parseFloat(responseText);
        if (!isNaN(balance)) {
          return `৳${balance.toFixed(2)}`;
        }
      }

      // If neither JSON nor plain number parsing worked, it's an API error message.
      throw new Error(`API Error: ${responseText}`);

    } catch (error: any) {
      console.error('Error fetching SMS balance:', error);
      throw new Error(error.message || 'An unknown error occurred while fetching balance.');
    }
  }
);
