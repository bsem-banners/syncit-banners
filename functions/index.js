const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendGroupNotification = functions.database
  .ref('/groups/{groupId}/events/{eventId}')
  .onCreate(async (snapshot, context) => {
    const { groupId } = context.params;
    const eventData = snapshot.val();
    
    // Get group members
    const groupSnapshot = await admin.database()
      .ref(`/groups/${groupId}`)
      .once('value');
    
    const group = groupSnapshot.val();
    const memberTokens = [];
    
    // Collect FCM tokens for all members
    for (const memberId in group.members) {
      if (group.members[memberId].status === 'accepted') {
        const userSnapshot = await admin.database()
          .ref(`/users/${memberId}/fcmToken`)
          .once('value');
        
        const token = userSnapshot.val();
        if (token) memberTokens.push(token);
      }
    }
    
    // Send notification
    if (memberTokens.length > 0) {
      const message = {
        notification: {
          title: `New Event in ${group.name}`,
          body: `${eventData.notes} on ${eventData.date}`
        },
        data: {
          groupId: groupId,
          eventId: context.params.eventId,
          type: 'new_event'
        },
        tokens: memberTokens
      };
      
      await admin.messaging().sendMulticast(message);
    }
  });

exports.sendInvitationNotification = functions.database
  .ref('/groups/{groupId}/members/{userId}')
  .onCreate(async (snapshot, context) => {
    const { groupId, userId } = context.params;
    const memberData = snapshot.val();
    
    if (memberData.status === 'pending') {
      // Get user's FCM token
      const userSnapshot = await admin.database()
        .ref(`/users/${userId}/fcmToken`)
        .once('value');
      
      const token = userSnapshot.val();
      if (token) {
        // Get group info
        const groupSnapshot = await admin.database()
          .ref(`/groups/${groupId}`)
          .once('value');
        
        const group = groupSnapshot.val();
        
        const message = {
          notification: {
            title: 'New Group Invitation',
            body: `${group.creator?.name || 'Someone'} invited you to join ${group.name}`
          },
          data: {
            groupId: groupId,
            type: 'group_invitation'
          },
          token: token
        };
        
        await admin.messaging().send(message);
      }
    }
  });