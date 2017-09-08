import {GraphQLID, GraphQLNonNull, GraphQLObjectType, GraphQLString} from 'graphql';
import AuthToken from 'server/graphql/types/AuthToken';
import Notification, {notificationInterfaceFields} from 'server/graphql/types/Notification';

const NotifyAddedToTeam = new GraphQLObjectType({
  name: 'NotifyAddedToTeam',
  description: 'A notification sent by a team member to request to become the facilitator',
  interfaces: () => [Notification],
  fields: () => ({
    ...notificationInterfaceFields,
    _authToken: {
      type: AuthToken,
      description: 'The new auth token for the user. Requested by, but not sent to the client'
    },
    inviterName: {
      type: GraphQLString,
      description: 'The name of the person that invited them onto the team'
    },
    teamName: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The name of the team the user is joining'
    },
    teamId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The teamId the user is joining'
    },
  })
});

export default NotifyAddedToTeam;
