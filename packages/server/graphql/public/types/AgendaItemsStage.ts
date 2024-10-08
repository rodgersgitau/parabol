import {AgendaItemsStageResolvers} from '../resolverTypes'

const AgendaItemsStage: AgendaItemsStageResolvers = {
  __isTypeOf: ({phaseType}) => phaseType === 'agendaitems',
  agendaItem: ({agendaItemId}, _args, {dataLoader}) => {
    return dataLoader.get('agendaItems').load(agendaItemId)
  }
}

export default AgendaItemsStage
