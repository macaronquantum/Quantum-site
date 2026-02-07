export interface Opportunity {
  id: string;
  companyName: string;
  sector: string;
  pitch: string;
  stage: string;
  requestedAmount: number;
  status: 'Open' | 'Closed' | 'Funded';
  overview: string;
  revenue: number;
  growth: number;
  burnRate: number;
  valuation: number;
  founded: string;
  team: number;
  videoThumbnail: string;
  founderVideoThumbnail: string;
  keyMetrics: {
    label: string;
    value: string;
  }[];
  roadmap: string[];
  votesYes: number;
  votesNo: number;
  votingDeadline: Date;
}

export const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: '1',
    companyName: 'NeuralForge AI',
    sector: 'LLM Infrastructure',
    pitch: 'Building the next-generation distributed training infrastructure for large language models with 10x cost reduction.',
    stage: 'Series A',
    requestedAmount: 25000000,
    status: 'Open',
    overview: 'NeuralForge AI is revolutionizing how AI companies train large language models. Our proprietary distributed computing protocol reduces training costs by 90% while improving model performance. We\'ve partnered with 15 leading AI labs and processed over 100 trillion tokens.',
    revenue: 3200000,
    growth: 450,
    burnRate: 800000,
    valuation: 120000000,
    founded: '2023',
    team: 34,
    videoThumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
    founderVideoThumbnail: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800',
    keyMetrics: [
      { label: 'Active Users', value: '15 AI Labs' },
      { label: 'Tokens Processed', value: '100T+' },
      { label: 'Cost Reduction', value: '90%' },
      { label: 'Uptime', value: '99.99%' },
    ],
    roadmap: [
      'Q2 2025: Launch enterprise tier with dedicated clusters',
      'Q3 2025: Expand to 50+ AI labs globally',
      'Q4 2025: Release open-source tools for community',
      'Q1 2026: Achieve profitability',
    ],
    votesYes: 12500000,
    votesNo: 3200000,
    votingDeadline: new Date('2025-08-15'),
  },
  {
    id: '2',
    companyName: 'QuantumSense Robotics',
    sector: 'Robotics & Automation',
    pitch: 'Autonomous warehouse robots powered by real-time multi-modal AI, deployed in 100+ facilities worldwide.',
    stage: 'Series B',
    requestedAmount: 40000000,
    status: 'Open',
    overview: 'QuantumSense is leading the autonomous robotics revolution in logistics. Our AI-powered robots navigate complex warehouse environments with 99.8% accuracy, processing 50,000 items per hour. Major partners include Amazon, DHL, and Walmart.',
    revenue: 18500000,
    growth: 340,
    burnRate: 2100000,
    valuation: 285000000,
    founded: '2022',
    team: 87,
    videoThumbnail: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800',
    founderVideoThumbnail: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
    keyMetrics: [
      { label: 'Robots Deployed', value: '2,500+' },
      { label: 'Facilities', value: '100+' },
      { label: 'Items/Hour', value: '50,000' },
      { label: 'Accuracy', value: '99.8%' },
    ],
    roadmap: [
      'Q2 2025: Expand to European markets',
      'Q3 2025: Launch next-gen robot with 2x speed',
      'Q4 2025: Reach 500 facilities',
      'Q1 2026: Enter manufacturing sector',
    ],
    votesYes: 18900000,
    votesNo: 5100000,
    votingDeadline: new Date('2025-08-20'),
  },
  {
    id: '3',
    companyName: 'SynthMind Labs',
    sector: 'AI Agents',
    pitch: 'Enterprise AI agents that autonomously handle customer support, reducing response times by 95%.',
    stage: 'Seed',
    requestedAmount: 8000000,
    status: 'Open',
    overview: 'SynthMind Labs creates hyper-intelligent AI agents that understand context, emotion, and complex business logic. Our agents handle 1M+ customer interactions daily across 200+ companies, achieving 94% customer satisfaction scores.',
    revenue: 950000,
    growth: 680,
    burnRate: 350000,
    valuation: 45000000,
    founded: '2024',
    team: 18,
    videoThumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
    founderVideoThumbnail: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
    keyMetrics: [
      { label: 'Daily Interactions', value: '1M+' },
      { label: 'Customers', value: '200+' },
      { label: 'Response Time', value: '2.3s avg' },
      { label: 'Satisfaction', value: '94%' },
    ],
    roadmap: [
      'Q2 2025: Launch voice-enabled agents',
      'Q3 2025: Expand to sales automation',
      'Q4 2025: Reach 500 enterprise customers',
      'Q1 2026: Launch agent marketplace',
    ],
    votesYes: 8200000,
    votesNo: 2800000,
    votingDeadline: new Date('2025-08-10'),
  },
  {
    id: '4',
    companyName: 'DataVault AI',
    sector: 'AI Infrastructure',
    pitch: 'Secure, privacy-preserving data infrastructure for training AI models on sensitive data without exposing it.',
    stage: 'Series A',
    requestedAmount: 18000000,
    status: 'Open',
    overview: 'DataVault AI enables organizations to train AI models on encrypted data using cutting-edge homomorphic encryption. Healthcare, finance, and government sectors trust us to keep their data secure while unlocking AI insights.',
    revenue: 5400000,
    growth: 290,
    burnRate: 950000,
    valuation: 95000000,
    founded: '2023',
    team: 42,
    videoThumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
    founderVideoThumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    keyMetrics: [
      { label: 'Data Protected', value: '50PB+' },
      { label: 'Enterprise Clients', value: '85' },
      { label: 'Compliance', value: 'SOC2, HIPAA' },
      { label: 'Breach Record', value: 'Zero' },
    ],
    roadmap: [
      'Q2 2025: Launch federated learning platform',
      'Q3 2025: Expand to APAC markets',
      'Q4 2025: Achieve FedRAMP certification',
      'Q1 2026: Partner with top 10 banks',
    ],
    votesYes: 14300000,
    votesNo: 4200000,
    votingDeadline: new Date('2025-08-25'),
  },
  {
    id: '5',
    companyName: 'CogniHealth',
    sector: 'Healthcare AI',
    pitch: 'AI-powered diagnostic platform detecting diseases 3 years earlier than traditional methods with 98% accuracy.',
    stage: 'Series A',
    requestedAmount: 22000000,
    status: 'Open',
    overview: 'CogniHealth combines computer vision, genomics, and patient data to predict diseases before symptoms appear. Our platform has screened 500,000+ patients and identified early-stage cancers, cardiovascular diseases, and neurological conditions with unprecedented accuracy.',
    revenue: 7200000,
    growth: 520,
    burnRate: 1200000,
    valuation: 150000000,
    founded: '2023',
    team: 56,
    videoThumbnail: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    founderVideoThumbnail: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
    keyMetrics: [
      { label: 'Patients Screened', value: '500K+' },
      { label: 'Accuracy', value: '98%' },
      { label: 'Hospital Partners', value: '120' },
      { label: 'Early Detection', value: '3 years' },
    ],
    roadmap: [
      'Q2 2025: FDA approval for cancer screening',
      'Q3 2025: Launch consumer app',
      'Q4 2025: Expand to 500 hospitals',
      'Q1 2026: International expansion (EU, Asia)',
    ],
    votesYes: 16800000,
    votesNo: 3900000,
    votingDeadline: new Date('2025-08-30'),
  },
];
