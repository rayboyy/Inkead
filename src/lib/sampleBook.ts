import { Book } from '../types';
import { generateTypographicCover } from './parsers/txtParser';

const SAMPLE_ESSAY_TEXT = `---
title: Self-Reliance & The Sovereign Soul
author: Ralph Waldo Emerson
---

# Chapter I: Trust Thyself

"Ne te quaesiveris extra." — Seek no cause, or counsel, or sanction, outside yourself.

Man is timid and apologetic; he is no longer upright; he dares not say 'I think,' 'I am,' but quotes some saint or sage. He is ashamed before the blade of grass or the blowing rose. These roses under my window make no reference to former roses or to better ones; they are for what they are; they exist with God to-day. There is for them no time. There is simply the rose; it is perfect in every moment of its existence. Before a leaf-bud has burst, its whole life acts; in the full-blown flower there is no more; in the leafless root there is no less. Its nature is satisfied, and it satisfies nature, in all moments alike.

Trust thyself: every heart vibrates to that iron string. Accept the place the divine providence has found for you, the society of your contemporaries, the connection of events. Great men have always done so, and confided themselves childlike to the genius of their age, betraying their perception that the absolutely trustworthy was seated at their heart, working through their hands, predominating in all their being. And we are now men, and must accept in the highest mind the same transcendent destiny; and not minors and invalids in a protected corner, not cowards fleeing before a revolution, but guides, redeemers, and benefactors, obeying the Almighty effort, and advancing on Chaos and the Dark.

What pretty oracles nature yields us on this text in the face and behavior of children, babes, and even brutes! That divided and rebel mind, that distrust of a sentiment because our arithmetic has computed the strength and means opposed to our purpose, these have not. Their mind being whole, their eye is as yet unconquered, and when we look in their faces, we are disconcerted. Infancy conforms to nobody: all conform to it.

# Chapter II: Society & Nonconformity

Whoso would be a man must be a nonconformist. He who would gather immortal palms must not be hindered by the name of goodness, but must explore if it be goodness. Nothing is at last sacred but the integrity of your own mind. Absolve you to yourself, and you shall have the suffrage of the world.

I remember an answer which when quite young I was prompted to make to a valued adviser, who was wont to importune me with the dear old doctrines of the church. On my saying, What have I to do with the sacredness of traditions, if I live wholly from within? my friend suggested: "But these impulses may be from below, not from above." I replied, "They do not seem to me to be such; but if I am the Devil's child, I will live then from the Devil." No law can be sacred to me but that of my nature. Good and bad are but names very readily transferable to that or this; the only right is what is after my constitution, the only wrong what is against it.

A man is to carry himself in the presence of all opposition as if every thing were titular and ephemeral but he. I am ashamed to think how easily we capitulate to badges and names, to large societies and dead institutions. Every decent and well-spoken individual affects and sways me more than is right. I ought to go upright and vital, and speak the rude truth in all ways.

If malice and vanity wear the coat of philanthropy, shall that pass? If an angry bigot assumes this bountiful cause of Abolition, and comes round to me with his last news from Barbadoes, why should I not say to him, "Go love thy wood-chopper; be good-natured and modest; have that grace; and never varnish your hard, uncharitable ambition with this incredible-tenderness for black folk a thousand miles off. Thy love afar is spite at home." Rough and graceless would be such greeting, but a true man speaks from his core, not from a painted mask.

# Chapter III: The Hobgoblin of Consistency

A foolish consistency is the hobgoblin of little minds, adored by little statesmen and philosophers and divines. With consistency a great soul has simply nothing to do. He may as well concern himself with his shadow on the wall. Speak what you think now in hard words, and to-morrow speak what to-morrow thinks in hard words again, though it contradict every thing you said to-day. — 'Ah, so you shall be sure to be misunderstood.' — Is it so bad, then, to be misunderstood? Pythagoras was misunderstood, and Socrates, and Jesus, and Luther, and Copernicus, and Galileo, and Newton, and every pure and wise spirit that ever took flesh. To be great is to be misunderstood.

Suppose you should contradict yourself; what then? It seems to be a rule of wisdom never to rely on your memory alone, scarcely even in acts of pure memory, but to bring the past for judgment into the thousand-eyed present, and live ever in a new day. In your metaphysics you have denied personality to the Deity: yet when the devout motions of the soul come, yield to them heart and life, though they should clothe God with shape and color. Leave your theory, as Joseph his coat in the hand of the harlot, and flee.

A sturdy lad from New Hampshire or Vermont, who in turn tries all the professions, who teams it, farms it, peddles, keeps a school, preaches, edits a newspaper, goes to Congress, buys a township, and so forth, in successive years, and always, like a cat, falls on his feet, is worth a hundred of these city dolls. He walks abreast with his days, and feels no shame in not 'studying a profession,' for he does not postpone his life, but lives already. He has not one chance, but a hundred chances.

# Chapter IV: The Sovereign Center

The voyage of the best ship is a zigzag line of a hundred tacks. See the line from a sufficient distance, and it straightens itself to the average tendency. Your genuine action will explain itself, and will explain your other genuine actions. Your conformity explains nothing. Act singly, and what you have already done singly will justify you now.

Greatness appeals to the future. If I can be firm enough to-day to do the right, and scorn eyes, I must have done so much right before as to defend me now. Be it how it will, do it now. Always scorn appearances, and you always may. The force of character is cumulative. All the foregone days of virtue work their health into this.

Where is the master who could have taught Shakespeare? Where is the master who could have instructed Franklin, or Washington, or Bacon, or Newton? Every great man is a unique. The Scipionism of Scipio is precisely that part he could not borrow. Shakespeare will never be made by the study of Shakespeare. Do that which is assigned you, and you cannot hope too much or dare too much.

Insist on yourself; never imitate. Your own gift you can present every moment with the cumulative force of a whole life's cultivation; but of the adopted talent of another, you have only an extemporaneous, half possession. That which each can do best, none but his Maker can teach him. Where is the master who could have told him what to produce? Plant yourself firmly in your native soil, and the heavens will open above you.
`;

export function getSampleBook(): Book {
  const encoder = new TextEncoder();
  const fileData = encoder.encode(SAMPLE_ESSAY_TEXT).buffer as ArrayBuffer;
  const wordCount = SAMPLE_ESSAY_TEXT.split(/\s+/).filter(Boolean).length;
  const title = 'Self-Reliance & The Sovereign Soul';
  const author = 'Ralph Waldo Emerson';

  return {
    id: 'sample-self-reliance-emerson',
    title,
    author,
    fileType: 'md',
    fileData,
    fileSize: fileData.byteLength,
    coverDataUrl: '',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000,
    lastReadAt: Date.now(),
    status: 'reading',
    pageCount: 4,
    currentPage: 1,
    progressPercent: 25,
    wordCount,
    estimatedMinutes: Math.ceil(wordCount / 230),
    chapters: [
      { id: 'ch-0', title: 'Chapter I: Trust Thyself', pageNumber: 1, chapterIndex: 0 },
      { id: 'ch-1', title: 'Chapter II: Society & Nonconformity', pageNumber: 2, chapterIndex: 1 },
      { id: 'ch-2', title: 'Chapter III: The Hobgoblin of Consistency', pageNumber: 3, chapterIndex: 2 },
      { id: 'ch-3', title: 'Chapter IV: The Sovereign Center', pageNumber: 4, chapterIndex: 3 },
    ],
  };
}
