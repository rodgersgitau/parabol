import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLNonNull
} from 'graphql'
import {
  AGENDA_ITEMS,
  CHECKIN,
  DISCUSS,
  FIRST_CALL,
  GROUP,
  LAST_CALL,
  REFLECT,
  UPDATES,
  VOTE
} from 'parabol-client/utils/constants'
import {getUserId} from '../../utils/authorization'
import AgendaItemsStage from './AgendaItemsStage'
import CheckInStage from './CheckInStage'
import GenericMeetingStage from './GenericMeetingStage'
import GraphQLISO8601Type from './GraphQLISO8601Type'
import NewMeeting from './NewMeeting'
import NewMeetingPhase from './NewMeetingPhase'
import NewMeetingPhaseTypeEnum from './NewMeetingPhaseTypeEnum'
import RetroDiscussStage from './RetroDiscussStage'
import UpdatesStage from './UpdatesStage'
import EstimateStage from './EstimateStage'

/*
 * Each meeting has many phases.
 * Each phase has 1 or more stages.
 * Each stage is an "instance" of a phase item type.
 * By instance, I mean it combines the phase item with meeting-specific state, like an instantiated class
 * A generic phase item (eg an Icebreaker) is created by parabol-defined server logic
 * A custom phase item (eg the Retrospective categories like 4Ls or Start, Stop, Continue) is defined by the team
 * Each type of meeting has type-specific state (see NewMeeting)
 * Each phase of each meeting has phase-specific state (see NewMeetingPhase)
 * Each stage that belongs to a phase has stage-specific logic (see below)
 */

export const newMeetingStageFields = () => ({
  id: {
    type: new GraphQLNonNull(GraphQLID),
    description: 'stageId, shortid'
  },
  endAt: {
    description: 'The datetime the stage was completed',
    type: GraphQLISO8601Type
  },
  meetingId: {
    type: new GraphQLNonNull(GraphQLID),
    description: 'foreign key. try using meeting'
  },
  meeting: {
    type: NewMeeting,
    description: 'The meeting this stage belongs to',
    resolve: ({meetingId}, _args, {dataLoader}) => {
      return dataLoader.get('newMeetings').load(meetingId)
    }
  },
  isComplete: {
    type: new GraphQLNonNull(GraphQLBoolean),
    description:
      'true if the facilitator has completed this stage, else false. Should be boolean(endAt)'
  },
  isNavigable: {
    type: new GraphQLNonNull(GraphQLBoolean),
    description: 'true if any meeting participant can navigate to this stage'
  },
  isNavigableByFacilitator: {
    type: new GraphQLNonNull(GraphQLBoolean),
    description: 'true if the facilitator can navigate to this stage'
  },
  phase: {
    type: NewMeetingPhase,
    description: 'The phase this stage belongs to',
    resolve: async ({meetingId, phaseType}, _args, {dataLoader}) => {
      const meeting = await dataLoader.get('newMeetings').load(meetingId)
      const {phases} = meeting
      return phases.find((phase) => phase.phaseType === phaseType)
    }
  },
  phaseType: {
    description: 'The type of the phase',
    type: NewMeetingPhaseTypeEnum
  },
  startAt: {
    description: 'The datetime the stage was started',
    type: GraphQLISO8601Type
  },
  viewCount: {
    description: 'Number of times the facilitator has visited this stage',
    type: GraphQLInt
  },
  isAsync: {
    type: GraphQLBoolean,
    description: 'true if a time limit is set, false if end time is set, null if neither is set'
  },
  isViewerReady: {
    type: GraphQLNonNull(GraphQLBoolean),
    description: 'true if the viewer is ready to advance, else false',
    resolve: ({readyToAdvance}, _args, {authToken}) => {
      const viewerId = getUserId(authToken)
      return readyToAdvance?.includes(viewerId) ?? false
    }
  },
  readyCount: {
    type: GraphQLNonNull(GraphQLInt),
    description: 'the number of meeting members ready to advance, excluding the facilitator',
    resolve: async ({meetingId, readyToAdvance}, _args, {dataLoader}, ref) => {
      if (!readyToAdvance) return 0
      if (!meetingId) console.log('no meetingid', ref)
      const meeting = await dataLoader.get('newMeetings').load(meetingId)
      const {facilitatorUserId} = meeting
      return readyToAdvance.filter((userId) => userId !== facilitatorUserId).length
    }
  },
  scheduledEndTime: {
    type: GraphQLISO8601Type,
    description:
      'The datetime the phase is scheduled to be finished, null if no time limit or end time is set'
  },
  suggestedEndTime: {
    type: GraphQLISO8601Type,
    description:
      'The suggested ending datetime for a phase to be completed async, null if not enough data to make a suggestion'
  },
  suggestedTimeLimit: {
    type: GraphQLFloat,
    description:
      'The suggested time limit for a phase to be completed together, null if not enough data to make a suggestion'
  },
  timeRemaining: {
    type: GraphQLFloat,
    description:
      'The number of milliseconds left before the scheduled end time. Useful for unsynced client clocks. null if scheduledEndTime is null',
    resolve: ({scheduledEndTime}) => {
      return scheduledEndTime ? scheduledEndTime - Date.now() : null
    }
  }
})

const NewMeetingStage = new GraphQLInterfaceType({
  name: 'NewMeetingStage',
  description:
    'An instance of a meeting phase item. On the client, this usually represents a single view',
  fields: newMeetingStageFields,
  resolveType: ({phaseType}) => {
    const resolveTypeLookup = {
      [CHECKIN]: CheckInStage,
      [REFLECT]: GenericMeetingStage,
      [GROUP]: GenericMeetingStage,
      [VOTE]: GenericMeetingStage,
      [DISCUSS]: RetroDiscussStage,
      [UPDATES]: UpdatesStage,
      [FIRST_CALL]: GenericMeetingStage,
      [AGENDA_ITEMS]: AgendaItemsStage,
      [LAST_CALL]: GenericMeetingStage,
      SCOPE: GenericMeetingStage,
      ESTIMATE: EstimateStage
    }

    return resolveTypeLookup[phaseType]
  }
})

export default NewMeetingStage
