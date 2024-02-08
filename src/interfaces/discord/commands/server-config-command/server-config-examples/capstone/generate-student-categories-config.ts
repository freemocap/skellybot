import * as fs from 'fs';

import * as yaml from 'yaml';

interface StudentInfo {
  username: string;
  studentId: string;
}

// Define the structure for the combined YAML configuration
interface CombinedConfig {
  roles: any[];
  members: any[];
  categories: any[];
  channels: any[];
}

// Initialize an empty combined config object
const combinedConfig: CombinedConfig = {
  roles: [],
  members: [],
  categories: [],
  channels: [],
};

// Function to add student data to the combined config
function addStudentToConfig(student: StudentInfo, config: CombinedConfig) {
  const studentIdColor = student.studentId; // Assuming studentId is a hex color code
  // Add roles
  config.roles.push({
    name: student.studentId,
    hoist: false,
    color: studentIdColor,
  });
  // Add members
  config.members.push({
    username: student.username,
    nickname: student.studentId,
    roles: [student.studentId, 'Student'],
  });
  // Add categories
  config.categories.push({
    name: student.studentId,
    // position: 0,
    permissionsOverwrites: [
      {
        roleName: student.studentId,
        allow: [
          'VIEW_CHANNEL',
          'SEND_MESSAGES',
          'READ_MESSAGE_HISTORY',
          'MANAGE_CHANNELS',
          'CREATE_PUBLIC_THREADS',
          'SEND_MESSAGES_IN_THREADS',
        ],
      },
      {
        roleName: 'Student',
        deny: [
          'SEND_MESSAGES',
          'CREATE_PUBLIC_THREADS',
          'SEND_MESSAGES_IN_THREADS',
        ],
      },
    ],
    botPromptMessages: [
      `This category is owned by the student with the id ${student.studentId}`,
      'They will add channels that will be configured to allow us to talk about different aspects of the capstone project',
    ],
  });
  // Add channels associated with this student
  const channelNames = ['general-chat', '🤖-prompt-settings'];
  channelNames.forEach((channelName) => {
    config.channels.push({
      name: channelName,
      type: 'text',
      topic: `This is the "#${channelName}" channel for the student with the id ${student.studentId}`,
      parentCategory: student.studentId,
    });
  });
}

// Example student mapping.
const students: StudentInfo[] = [
  { username: 'jkl', studentId: '#BEEFED' },
  { username: 'SkellyBot', studentId: '#FF9900' },
];

// Add each student to the combined YAML configuration
students.forEach((student) => {
  addStudentToConfig(student, combinedConfig);
  console.log(`Added ${student.username} to combined YAML config`);
});

console.log('All student configurations have been added to combined YAML.');
const combinedYaml = yaml.stringify(combinedConfig);

// Save the combined YAML configuration to a file
const outputPath = './category-per-student-config.yaml';
fs.mkdirSync('./output', { recursive: true });
fs.writeFileSync(outputPath, combinedYaml, 'utf8');
