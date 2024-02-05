import * as fs from 'fs';

interface StudentInfo {
  username: string;
  studentId: string;
}

const template = `
roles:
  - name: "{studentId}"
    hoist: false
    color: "{studentId}" # studentId is a hex color code
    
  - name: "Student"
    hoist: true


members:
  - username: "{username}"
    nickname: "{studentId}"
    roles:
      - "{studentId}"
      - "Student"
categories:
  - name: "{studentId}"
    position: 0
    permissionsOverwrites:
      - roleName: "{studentId}"
        allow:
          - "VIEW_CHANNEL"
          - "SEND_MESSAGES"
          - "READ_MESSAGE_HISTORY"
      - roleName: "Student"
        deny:
          - "SEND_MESSAGES"

    botPromptMessages:
      - "This category is owned by the student with the id {studentId}"
      - "They will add channels that will be configured to allow us to talk about different aspects of the capstone project"

channels:
  - name: "capstone-document"
    type: text
    topic: "This is the main channel to discuss the actual capstone document!"
    parentCategory: "{studentId}"

  - name: "progress-capture"
    type: text
    topic: "This is the main channel to capture progress on the capstone project!"
    parentCategory: "{studentId}"

  - name: "general-chat"
    type: text
    topic: "This is a general purpose channel to discuss uncategorized topics"
    parentCategory: "{studentId}"
`;

// Function to replace placeholders in the template with actual student information.
function generateYamlForStudent(student: StudentInfo): string {
  return template
    .replace(/\{username}/g, student.username)
    .replace(/\{studentId}/g, student.studentId);
}

// Example student mapping.
const students: StudentInfo[] = [
  { username: 'jonmatthis', studentId: '#FF00FF' },
  // Add more student mappings here...
];

// Generate and save YAML configuration for each student.
students.forEach((student) => {
  const studentYaml = generateYamlForStudent(student);
  const outputPath = `./student-categories-config.yaml`;
  fs.mkdirSync('./output', { recursive: true });
  fs.writeFileSync(outputPath, studentYaml, 'utf8');
  console.log(`Generated YAML config for ${student.username}`);
});

console.log('All YAML configurations have been generated.');
