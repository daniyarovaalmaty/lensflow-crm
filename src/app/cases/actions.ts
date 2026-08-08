'use server';

import prisma from '@/lib/db/prisma';

export async function submitCaseVote(caseId: number, vote: string) {
  try {
    const result = await prisma.caseVote.create({
      data: {
        caseId,
        vote,
        voterName: 'Аноним', // Since anonymous voting was requested
      }
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to submit vote:', error);
    return { success: false, error: 'Failed to submit vote' };
  }
}
