import {MeetingTypeEnum, NewMeetingPhaseTypeEnum} from 'parabol-client/types/graphql'

export const up = async function(r) {
  try {
    const actionMeetings = await r
      .table('NewMeeting')
      .filter({meetingType: MeetingTypeEnum.action})
      .run()
    // TODO: depending on production data, may need to chunk this
    const updates = [] as {
      agendaItemId: string
      meetingId: string
    }[]
    actionMeetings.forEach((meeting) => {
      meeting.phases.forEach((phase) => {
        if (phase.phaseType !== NewMeetingPhaseTypeEnum.agendaitems) return
        phase.stages.forEach((stage) => {
          if (stage.phaseType !== NewMeetingPhaseTypeEnum.agendaitems) return
          updates.push({
            meetingId: meeting.id,
            agendaItemId: stage.agendaItemId
          })
        })
      })
    })

    await r(updates)
      .forEach((update) => {
        return r
          .table('AgendaItem')
          .get(update('agendaItemId'))
          .update({meetingId: update('meetingId')})
      })
      .run()
  } catch (e) {
    console.log(e)
  }
}

export const down = async function(r) {
  try {
    await r
      .table('AgendaItem')
      .replace((row) => row.without('meetingId'))
      .run()
  } catch (e) {
    console.log(e)
  }
}
