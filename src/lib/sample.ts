import type { DecodeResponse } from '../types';

/** Realistic sample instructions a user can load with one click. */
export const SAMPLE_INSTRUCTIONS = `Research Paper: The Impact of Social Media on Adolescent Mental Health

For this assignment you will write an 8-10 page research paper (APA format, double
spaced, 12pt Times New Roman) examining how social media use affects the mental
health of adolescents aged 13-18.

Requirements:
- Use at least 6 peer-reviewed academic sources published within the last 10 years.
- Include a clear thesis statement in the introduction.
- Your paper must contain: an introduction, a literature review, a discussion of at
  least two opposing viewpoints, and a conclusion.
- Include a properly formatted APA reference page (not counted in the page total).
- Submit a one-paragraph topic proposal before you begin the full draft.

Grading: thesis & argument (30%), use of sources (25%), organization (20%),
APA formatting (15%), grammar & style (10%).

Late submissions lose 10% per day. Submit as a PDF through the course portal.`;

export const SAMPLE_COURSE = 'PSY 201 — Developmental Psychology';

/**
 * Precomputed decode result used when the sample is loaded or when a live decode
 * fails. Mirrors what Gemini would return, so the full app flow is demonstrable
 * offline. Items are clearly split into explicit requirements vs AI suggestions.
 */
export const SAMPLE_DECODE: DecodeResponse = {
  title: 'Research Paper: Social Media & Adolescent Mental Health',
  requirements: [
    { text: 'Write an 8–10 page research paper in APA format (double spaced, 12pt Times New Roman).', source: 'explicit' },
    { text: 'Use at least 6 peer-reviewed sources published within the last 10 years.', source: 'explicit' },
    { text: 'Include a clear thesis statement in the introduction.', source: 'explicit' },
    { text: 'Include introduction, literature review, discussion of two opposing viewpoints, and conclusion.', source: 'explicit' },
    { text: 'Include a properly formatted APA reference page (excluded from page count).', source: 'explicit' },
    { text: 'Submit a one-paragraph topic proposal before the full draft.', source: 'explicit' },
    { text: 'Submit the final paper as a PDF through the course portal.', source: 'explicit' },
    { text: 'Consider building an annotated source list to track how each source supports your thesis.', source: 'suggested' },
    { text: 'Leave a buffer day for proofreading since late work loses 10% per day.', source: 'suggested' },
  ],
  tasks: [
    { title: 'Choose a focused topic and draft the one-paragraph proposal', estimateMinutes: 45, source: 'explicit' },
    { title: 'Find and skim 6+ peer-reviewed sources from the last 10 years', estimateMinutes: 150, source: 'explicit' },
    { title: 'Write a working thesis statement', estimateMinutes: 30, source: 'explicit' },
    { title: 'Draft the literature review section', estimateMinutes: 120, source: 'explicit' },
    { title: 'Write the section covering two opposing viewpoints', estimateMinutes: 90, source: 'explicit' },
    { title: 'Write the introduction and conclusion', estimateMinutes: 75, source: 'explicit' },
    { title: 'Build the APA reference page and in-text citations', estimateMinutes: 60, source: 'explicit' },
    { title: 'Proofread, format to APA, and export to PDF', estimateMinutes: 60, source: 'suggested' },
  ],
};
