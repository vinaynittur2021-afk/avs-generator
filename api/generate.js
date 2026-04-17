const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { oneliner, careplan } = req.body;

  if (!oneliner || !careplan) {
    return res.status(400).json({ error: 'Both oneliner and careplan are required.' });
  }

  const SYSTEM_PROMPT = `You are an After Visit Summary (AVS) generator for VA Long Beach Healthcare System, Hematology/Oncology department.

When given a PHI-free clinical one-liner and care plan, generate a warm, plain-English After Visit Summary that a patient or their family can understand without medical training.

Format your response using these exact section headers preceded by ###:
### Your Diagnosis
### Your Treatment History
### What Happened at Today's Visit
### Your Medications
### What to Watch For
### Your Next Steps
### When to Call Your Care Team

Rules:
- Write for a patient reading level (8th grade), never use jargon without a plain-English explanation immediately after in parentheses
- Warm and reassuring tone
- No PHI: no patient name, DOB, MRN
- Keep each section to 3-8 concise bullet points or sentences
- In "When to Call Your Care Team", always include fever >= 100.4F as a red flag
- Use bullet points starting with - for lists
- End with this exact line: VA Long Beach Healthcare System | Hematology/Oncology | Questions? Contact your care team.
- Use ### headers and plain text only. No markdown code blocks or asterisks.`;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: 'Clinical one-liner: ' + oneliner + '\n\nCare plan:\n' + careplan
      }
    ]
  });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: body
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Anthropic error:', JSON.stringify(err));
      return res.status(500).json({ error: 'Failed to generate AVS. Please try again.' });
    }

    const data = await response.json();
    const avs = data.content[0].text;

    return res.status(200).json({ avs });

  } catch (err) {
    console.error('Server error:', err.message);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
};
