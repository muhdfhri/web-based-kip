export const oilClarificationTourConfig = {
  overview: [
    {
      target: '[data-tour="oc-tab-overview"]',
      title: 'Oil Clarification Overview',
      content: 'Main settling and clarification canvas showing Sand Trap Tank, CST Tank, and Vibration Screens.',
    },
    {
      target: '[data-tour="oc-overview-sandtrap"]',
      title: 'Sand Trap Tank',
      content: 'Removes heavy sand and grit from crude palm oil before clarification.',
    },
    {
      target: '[data-tour="oc-overview-sludge-tank"]',
      title: 'Sludge Tank',
      content: 'Collects heavy sludge phase for secondary oil recovery processing.',
    },
  ],
  recovery: [
    {
      target: '[data-tour="oc-tab-recovery"]',
      title: 'Oil Recovery Section',
      content: 'Monitors Decanter and Sludge Separators for recovering residual oil.',
    },
  ],
  purify: [
    {
      target: '[data-tour="oc-tab-purify"]',
      title: 'Oil Purify Section',
      content: 'Monitors Oil Purifiers and Vacuum Dryer for moisture reduction.',
    },
  ],
  storage: [
    {
      target: '[data-tour="oc-tab-storage"]',
      title: 'Storage & Dispatch',
      content: 'Tracks final CPO Storage Tank levels and CPO dispatch pumps.',
    },
  ],
};
