// api/generate.js
// This file runs on Vercel's server — the API key is NEVER sent to the browser.

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { oneliner, careplan } = req.body;

  if (!oneliner || !careplan) {
    return res.status(400).json({ error: 'Both oneliner and careplan are required.' });
  }

  const SYSTEM_PROMPT = `You are an After Visit Summary (AVS) generator for VA Long Beach Healthcare System, Hematology/Oncology department.

When given a PHI-free clinical one-liner and care plan, generate a warm, plain-English After Visit Summary that a patient (or their family) can understand without medical training.

Format your response using these exact section headers preceded by ###:
### Your Diagnosis
### Your Treatment History
### What Happened at Today's Visit
### Your Medications
### What to Watch For
### Your Next Steps
### When to Call Your Care Team

Rules:
- Write for a patient reading level (8th grade), never use jargon without explaining it in plain English immediately after
- Be warm and reassuring in tone, not cold or clinical
- For each medical term you use, follow it immediately with a plain-English explanation in parentheses
- Do NOT include patient name, date of birth, MRN, or any PHI
- Keep each section concise but complete — 3 to 8 bullet points or sentences per section
- In "When to Call Your Care Team", always include fever ≥ 100.4°F as a red flag
- Use bullet points (starting with - ) for lists
- End the summary with this exact line on its own: VA Long Beach Healthcare System | Hematology/Oncology | Questions? Contact your care team.

Do not use markdown code blocks or asterisks. Use ### headers and plain text only.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,   // Stored securely in Vercel dashboard
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Clinical one-liner: ${oneliner}\n\nCare plan:\n${careplan}`
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ error: 'Failed to generate AVS. Please try again.' });
    }

    const data = await response.json();
    const avs = data.content[0].text;

    return res.status(200).json({ avs });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}
