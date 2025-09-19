const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getMessaging} = require('firebase-admin/messaging');
const {onSchedule} = require('firebase-functions/v2/scheduler');

initializeApp();

// Handle group creation (send invitations to new members)
exports.sendGroupInvitations = onDocumentCreated({
  document: 'groups/{groupId}',
  region: 'europe-west2'
}, async (event) => {
  console.log('New group created:', event.params.groupId);
  
  const groupData = event.data.data();
  const groupName = groupData.name;
  const adminId = groupData.admin;
  
  // Get admin user data for sender name
  let adminName = 'Someone';
  try {
    const adminDoc = await getFirestore().collection('users').doc(adminId).get();
    const adminData = adminDoc.data();
    if (adminData && adminData.name) {
      adminName = adminData.name;
    }
  } catch (error) {
    console.error('Error getting admin data:', error);
  }
  
  // Find pending members (newly invited)
  const pendingMembers = (groupData.members || []).filter(member => 
    member.status === 'pending' && member.id !== adminId
  );
  
  console.log('Sending invitations to', pendingMembers.length, 'members');
  
  // Send invitation notifications to pending members
  for (const member of pendingMembers) {
    try {
      const userDoc = await getFirestore().collection('users').doc(member.id).get();
      const userData = userDoc.data();
      
      if (userData && userData.fcmToken) {
        await getMessaging().send({
          notification: {
            title: 'New Group Invitation',
            body: `${adminName} invited you to join "${groupName}"`
          },
          data: {
            groupId: event.params.groupId,
            groupName: groupName,
            senderName: adminName,
            type: 'group_invite'
          },
          token: userData.fcmToken
        });
        
        console.log('Invitation sent to:', member.name);
      } else {
        console.log('No FCM token for user:', member.id);
      }
    } catch (error) {
      console.error('Error sending invitation to', member.id, ':', error);
    }
  }
});

// Handle group updates (new events, member additions, etc.)
exports.sendGroupNotifications = onDocumentUpdated({
  document: 'groups/{groupId}',
  region: 'europe-west2'
}, async (event) => {
  console.log('Group updated:', event.params.groupId);
  
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  
  // Check for new members added to existing group
  const beforeMembers = beforeData.members || [];
  const afterMembers = afterData.members || [];
  
  const newMembers = afterMembers.filter(member => 
    member.status === 'pending' && 
    !beforeMembers.find(m => m.id === member.id)
  );
  
  // Send invitation notifications for new members
  if (newMembers.length > 0) {
    // Get admin name
    let adminName = 'Someone';
    try {
      const adminDoc = await getFirestore().collection('users').doc(afterData.admin).get();
      const adminData = adminDoc.data();
      if (adminData && adminData.name) {
        adminName = adminData.name;
      }
    } catch (error) {
      console.error('Error getting admin data:', error);
    }
    
    console.log('Sending invitations to', newMembers.length, 'new members');
    
    for (const member of newMembers) {
      try {
        const userDoc = await getFirestore().collection('users').doc(member.id).get();
        const userData = userDoc.data();
        
        if (userData && userData.fcmToken) {
          await getMessaging().send({
            notification: {
              title: 'New Group Invitation',
              body: `${adminName} added you to "${afterData.name}"`
            },
            data: {
              groupId: event.params.groupId,
              groupName: afterData.name,
              senderName: adminName,
              type: 'group_invite'
            },
            token: userData.fcmToken
          });
          
          console.log('Invitation sent to new member:', member.name);
        } else {
          console.log('No FCM token for new member:', member.id);
        }
      } catch (error) {
        console.error('Error sending invitation notification:', error);
      }
    }
  }
  
  // Check for new events
  const beforeEvents = beforeData.events || [];
  const afterEvents = afterData.events || [];
  
  if (afterEvents.length > beforeEvents.length) {
    const newEvent = afterEvents[afterEvents.length - 1];
    
    console.log('New event detected:', newEvent.notes); // Fixed: changed from title to notes
    
    // Get event creator name
    let creatorName = 'Someone';
    try {
      const creatorDoc = await getFirestore().collection('users').doc(newEvent.createdBy).get();
      const creatorData = creatorDoc.data();
      if (creatorData && creatorData.name) {
        creatorName = creatorData.name;
      }
    } catch (error) {
      console.error('Error getting creator data:', error);
    }
    
    // Send to all accepted members except the creator
    const acceptedMembers = (afterData.members || []).filter(member => 
      member.status === 'accepted' && member.id !== newEvent.createdBy
    );
    
    console.log('Sending event notifications to', acceptedMembers.length, 'members');
    
    for (const member of acceptedMembers) {
      try {
        const userDoc = await getFirestore().collection('users').doc(member.id).get();
        const userData = userDoc.data();
        
        if (userData && userData.fcmToken) {
          await getMessaging().send({
            notification: {
              title: 'New Event',
              body: `${creatorName} created "${newEvent.notes}" in ${afterData.name}` // Fixed: changed from title to notes
            },
            data: {
              groupId: event.params.groupId,
              groupName: afterData.name,
              eventTitle: newEvent.notes, // Fixed: changed from title to notes
              senderName: creatorName,
              type: 'new_event'
            },
            token: userData.fcmToken
          });
          
          console.log('Event notification sent to:', member.name);
        } else {
          console.log('No FCM token for member:', member.id);
        }
      } catch (error) {
        console.error('Error sending event notification:', error);
      }
    }
  }
  
  // Check for deleted events
  if (beforeEvents.length > afterEvents.length) {
    // Find which event was deleted
    const deletedEvent = beforeEvents.find(beforeEvent => 
      !afterEvents.find(afterEvent => afterEvent.id === beforeEvent.id)
    );
    
    if (deletedEvent) {
      console.log('Event deleted:', deletedEvent.notes);
      
      // Send to all accepted members
      const acceptedMembers = (afterData.members || []).filter(member => 
        member.status === 'accepted'
      );
      
      console.log('Sending event deletion notifications to', acceptedMembers.length, 'members');
      
      for (const member of acceptedMembers) {
        try {
          const userDoc = await getFirestore().collection('users').doc(member.id).get();
          const userData = userDoc.data();
          
          if (userData && userData.fcmToken) {
            await getMessaging().send({
              notification: {
                title: 'Event Cancelled',
                body: `"${deletedEvent.notes}" was cancelled in ${afterData.name}`
              },
              data: {
                groupId: event.params.groupId,
                groupName: afterData.name,
                eventTitle: deletedEvent.notes,
                type: 'event_deleted'
              },
              token: userData.fcmToken
            });
            
            console.log('Event deletion notification sent to:', member.name);
          }
        } catch (error) {
          console.error('Error sending event deletion notification:', error);
        }
      }
    }
  }
  
  // Check for member status changes (accepted invitations)
  const memberStatusChanges = afterMembers.filter((afterMember) => {
    const beforeMember = beforeMembers.find(m => m.id === afterMember.id);
    return beforeMember && 
           beforeMember.status === 'pending' && 
           afterMember.status === 'accepted';
  });
  
  if (memberStatusChanges.length > 0) {
    console.log('Member status changes detected:', memberStatusChanges.length);
    
    for (const acceptedMember of memberStatusChanges) {
      // Notify admin that member joined
      try {
        const adminDoc = await getFirestore().collection('users').doc(afterData.admin).get();
        const adminData = adminDoc.data();
        
        if (adminData && adminData.fcmToken && afterData.admin !== acceptedMember.id) {
          await getMessaging().send({
            notification: {
              title: 'Member Joined',
              body: `${acceptedMember.name} joined "${afterData.name}"`
            },
            data: {
              groupId: event.params.groupId,
              groupName: afterData.name,
              memberName: acceptedMember.name,
              type: 'member_joined'
            },
            token: adminData.fcmToken
          });
          
          console.log('Member joined notification sent to admin');
        }
      } catch (error) {
        console.error('Error sending member joined notification:', error);
      }
    }
  }
});

// Monthly cleanup of expired account deletions (30-day compliance)
exports.cleanupExpiredAccounts = onSchedule({
  schedule: '0 0 2 * *',  // Fixed: At 00:00 on day-of-month 2
  timeZone: 'Europe/London',
  region: 'europe-west2'
}, async (event) => {
  console.log('Starting monthly account cleanup job');
  
  const db = getFirestore();
  const now = new Date();
  
  try {
    // Find users scheduled for deletion whose time has passed
    const usersSnapshot = await db.collection('users')
      .where('deletionStatus', '==', 'pending')
      .where('scheduledDeletionDate', '<=', now)
      .get();
    
    console.log(`Found ${usersSnapshot.size} expired accounts to delete`);
    
    const batch = db.batch();
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      console.log(`Processing deletion for user: ${userId}`);
      
      // 1. Create legal retention record (minimal data only)
      const retentionRef = db.collection('legal_retention').doc(`retention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      batch.set(retentionRef, {
        userIdHash: userId.substring(0, 8) + '***', // Anonymized
        accountCreatedAt: userData.createdAt || null,
        accountDeletedAt: now,
        retentionReason: 'legal_compliance',
        dataType: 'account_lifecycle',
        expiresAt: new Date(now.getTime() + (7 * 365 * 24 * 60 * 60 * 1000)) // 7 years from now
      });
      
      // 2. Create deletion log
      const logRef = db.collection('deletion_logs').doc(`deletion_${Date.now()}_${userId.substring(0, 8)}`);
      batch.set(logRef, {
        userId: userId,
        deletionRequestedAt: userData.deletionRequested,
        deletionCompletedAt: now,
        deletionMethod: 'automated_30_day',
        dataRemoved: ['profile', 'group_memberships'],
        retainedData: ['legal_compliance_record'],
        processedBy: 'automated'
      });
      
      // 3. Delete user document
      batch.delete(userDoc.ref);
    });
    
    // Execute all operations
    await batch.commit();
    console.log(`Successfully deleted ${usersSnapshot.size} expired accounts`);
    
  } catch (error) {
    console.error('Error during account cleanup:', error);
  }
});