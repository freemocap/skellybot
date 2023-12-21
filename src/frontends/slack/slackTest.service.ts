// import {Injectable} from '@nestjs/common';
// import {Action, Command, Event, Message} from 'nestjs-slack-bolt';
// import {SlackActionMiddlewareArgs, SlackCommandMiddlewareArgs, SlackEventMiddlewareArgs,} from '@slack/bolt';
//
// @Injectable()
// export class SlackTestService {
//   @Message('hi') //Handle a message event
//   message({say}: SlackEventMiddlewareArgs) {
//     say('Hello');
//   }
//
//   @Action('click') //Handle an action
//   action({say}: SlackActionMiddlewareArgs) {
//     say('click event received');
//   }
//
//   @Command('/list') // handle command
//   command({say}: SlackCommandMiddlewareArgs) {
//     say('/list command received');
//   }
//
//   @Event('app_home_opened')
//   event({say}: SlackEventMiddlewareArgs) {
//     say('app_open_event received');
//   }
//
//   @Shortcut('test_shortcut') //Handle a shortcut event
//   async shortcut({shortcut, ack, client, logger}) {
//     try {
//       // Acknowledge shortcut request
//       await ack();
//
//       // Call the views.open method using one of the built-in WebClients
//       const result = await client.views.open({
//         trigger_id: shortcut.trigger_id,
//         view: {
//           type: 'modal',
//           title: {
//             type: 'plain_text',
//             text: 'My App',
//           },
//           close: {
//             type: 'plain_text',
//             text: 'Close',
//           },
//           blocks: [
//             {
//               type: 'section',
//               text: {
//                 type: 'mrkdwn',
//                 text: 'About the simplest modal you could conceive of :smile:\n\nMaybe <https://api.slack.com/reference/block-kit/interactive-components|*make the modal interactive*> or <https://api.slack.com/surfaces/modals/using#modifying|*learn more advanced modal use cases*>.',
//               },
//             },
//             {
//               type: 'context',
//               elements: [
//                 {
//                   type: 'mrkdwn',
//                   text: 'Psssst this modal was designed using <https://api.slack.com/tools/block-kit-builder|*Block Kit Builder*>',
//                 },
//               ],
//             },
//           ],
//         },
//       });
//
//       logger.info(result);
//     } catch (error) {
//       logger.error(error);
//     }
//   }
// }