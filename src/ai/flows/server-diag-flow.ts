
'use server';
/**
 * @fileOverview A flow to diagnose the server's public IP address.
 *
 * - getServerIp - A function that returns the server's public IP address.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

export async function getServerIp(): Promise<string> {
    return serverIpFlow();
}

const serverIpFlow = ai.defineFlow(
  {
    name: 'serverIpFlow',
    inputSchema: z.void(),
    outputSchema: z.string(),
  },
  async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (!response.ok) {
        throw new Error(`Failed to fetch IP: ${response.statusText}`);
      }
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error fetching server IP:', error);
      throw new Error('Could not retrieve server IP address.');
    }
  }
);
