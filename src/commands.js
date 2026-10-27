const cmd = (name, description, options) => ({ name, description, type: 1, ...(options ? { options } : {}) });
const sub = (name, description) => ({ type: 1, name, description });

export const COMMANDS = [
  cmd('start', 'Create your ScioWorld player'),
  cmd('explore', 'Search for materials, coins, and rare frog artifacts'),
  cmd('inventory', 'Check your inventory and contributions'),
  cmd('world', 'See the community civilization and next construction goal'),
  cmd('build', 'Donate wood or stone to the shared civilization', [
    { type: 3, name: 'resource', description: 'What will you contribute?', required: true,
      choices: [{ name: 'Wood (1 point)', value: 'wood' }, { name: 'Stone (2 points)', value: 'stone' }] },
    { type: 4, name: 'amount', description: 'How many? (1–20)', required: true, min_value: 1, max_value: 20 }
  ]),
  cmd('leaderboard', 'View the top civilization contributors'),
  cmd('frog', 'Ask the Frog of Wisdom for terrible advice'),
  cmd('camp', 'View approved ScioVirtual information', [
    sub('resources', 'View approved ScioVirtual resources'),
    sub('courses', 'Browse ScioVirtual course information'),
    sub('schedule', 'Find upcoming ScioVirtual events')
  ])
];
