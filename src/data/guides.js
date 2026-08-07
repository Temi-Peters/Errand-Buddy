// Short explainers shown the first time someone lands on their dashboard, and
// reopenable any time from the help button.
//
// Written for someone who is not confident with apps: plain words, no product
// jargon, one idea per card, and framed as "what you can do" rather than "what
// we built". The version number is what re-shows them — bump it when the cards
// materially change, not for a typo fix, or you'll nag people who already read them.

export const GUIDE_VERSION = 1;

export const customerGuide = {
  title: 'How ErrandBuddy works',
  intro: 'A quick tour — under a minute. You can bring this back any time from the Help button.',
  cards: [
    {
      emoji: '🛒',
      title: 'Ask for what you need',
      body: 'Book an errand and write your shopping list, one item per line. Add a photo of anything specific — a picture of the exact loaf saves any guesswork.'
    },
    {
      emoji: '🔄',
      title: 'Say what to do if something is out of stock',
      body: 'Choose whether your runner should ring you, pick something similar, or just leave it. You can also name a backup for any item, like "if no Hovis, get Warburtons".'
    },
    {
      emoji: '💷',
      title: 'Set a spending limit',
      body: 'Tell us roughly what the shopping should cost. You will never be charged more than that without being asked first — if it comes to more, we only take what you agreed.'
    },
    {
      emoji: '📱',
      title: 'Answer while they are in the shop',
      body: 'If something is unavailable your runner can send you a photo of an alternative. Two buttons — yes or no. Turn on notifications so you see it straight away.'
    },
    {
      emoji: '🧾',
      title: 'See what was actually bought',
      body: 'Your runner marks off each item and can add a photo of the receipt, so you can always check what was spent on your behalf.'
    },
    {
      emoji: '👋',
      title: 'Someone can help you book',
      body: 'A family member or carer can be linked to your account and book errands for you. Invite them from the Carers tab.'
    }
  ]
};

export const runnerGuide = {
  title: 'Running errands with ErrandBuddy',
  intro: 'The essentials before your first job. Bring this back any time from the Help button.',
  cards: [
    {
      emoji: '✅',
      title: 'Check the list before you accept',
      body: 'Open jobs show what the customer needs and how much they expect to spend. Once you accept you are committed, so have a look first.'
    },
    {
      emoji: '📍',
      title: 'Details unlock when you accept',
      body: 'You see the area before accepting, and the full address and phone number once the job is yours. Tap either to open maps or ring them.'
    },
    {
      emoji: '🔄',
      title: 'Never guess on a swap',
      body: 'If something is out of stock, tap "Ask customer", suggest an alternative and add a photo. They get a notification and answer while you are still in the shop.'
    },
    {
      emoji: '💷',
      title: 'Respect the spending limit',
      body: 'Each job shows what the customer agreed to spend. If you go over you will need to say why — and they are only charged what they agreed, so check before spending more.'
    },
    {
      emoji: '🧾',
      title: 'Photograph the receipt',
      body: 'When you finish, add a photo of the receipt and enter what you spent. That is what gets you reimbursed on top of your fee.'
    },
    {
      emoji: '⭐',
      title: 'Your rating builds over time',
      body: 'You show as a new runner until you have a few reviews — nothing is held against you at the start. Ratings come from customers after completed errands.'
    }
  ]
};
