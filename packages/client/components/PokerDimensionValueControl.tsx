import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import React, {useEffect, useRef, useState} from 'react'
import {createFragmentContainer} from 'react-relay'
import useBreakpoint from '~/hooks/useBreakpoint'
import {PALETTE} from '~/styles/paletteV3'
import {Breakpoint, SprintPokerDefaults} from '~/types/constEnums'
import useAtmosphere from '../hooks/useAtmosphere'
import useForceUpdate from '../hooks/useForceUpdate'
import useModal from '../hooks/useModal'
import useMutationProps from '../hooks/useMutationProps'
import useResizeFontForElement from '../hooks/useResizeFontForElement'
import PokerSetFinalScoreMutation from '../mutations/PokerSetFinalScoreMutation'
import {PokerDimensionValueControl_stage} from '../__generated__/PokerDimensionValueControl_stage.graphql'
import {PokerSetFinalScoreMutationResponse} from '../__generated__/PokerSetFinalScoreMutation.graphql'
import AddMissingJiraFieldModal from './AddMissingJiraFieldModal'
import LinkButton from './LinkButton'
import MiniPokerCard from './MiniPokerCard'
import PokerDimensionFinalScoreJiraPicker from './PokerDimensionFinalScoreJiraPicker'
import StyledError from './StyledError'

const ControlWrap = styled('div')({
  padding: '0 8px'
})

const Control = styled('div')({
  alignItems: 'center',
  backgroundColor: '#FFF',
  borderRadius: 4,
  display: 'flex',
  padding: 8
})

const Input = styled('input')<{color?: string}>(({color}) => ({
  background: 'none',
  border: 0,
  color: color || PALETTE.SLATE_700,
  display: 'block',
  fontSize: 18,
  fontWeight: 600,
  lineHeight: '24px',
  outline: 0,
  padding: 0,
  textAlign: 'center',
  width: '100%',
  '::placeholder': {
    color: 'rgba(125, 125, 125, .25)'
  }
}))

const ErrorMessage = styled(StyledError)({
  paddingLeft: 8,
  textAlign: 'left'
})

const Label = styled('div')({
  flexShrink: 0,
  fontSize: 14,
  fontWeight: 600,
  margin: '0 0 0 16px'
})

const StyledLinkButton = styled(LinkButton)({
  color: PALETTE.SKY_500,
  fontSize: 14,
  fontWeight: 600,
  height: 40,
  marginLeft: 8,
  padding: '0 8px',
  ':hover,:focus,:active': {
    boxShadow: 'none',
    color: PALETTE.SKY_600
  }
})

interface Props {
  isFacilitator: boolean
  placeholder: string
  stage: PokerDimensionValueControl_stage
}

const PokerDimensionValueControl = (props: Props) => {
  const {isFacilitator, placeholder, stage} = props
  const {id: stageId, dimensionRef, meetingId, serviceField, task} = stage
  const finalScore = stage.finalScore || ''
  const {name: serviceFieldName, type: serviceFieldType} = serviceField
  const {scale} = dimensionRef
  const {values: scaleValues} = scale
  const inputRef = useRef<HTMLInputElement>(null)
  const atmosphere = useAtmosphere()
  const {submitMutation, submitting, error, onError, onCompleted} = useMutationProps()
  const errorStr = error?.message ?? ''
  const lastSubmittedFieldRef = useRef(serviceFieldName)
  const isLocallyValidatedRef = useRef(true)
  const [cardScore, setCardScore] = useState(finalScore)
  const isStale = cardScore !== finalScore || lastSubmittedFieldRef.current !== serviceFieldName
  const {closePortal, openPortal, modalPortal} = useModal()
  const forceUpdate = useForceUpdate()
  useEffect(() => {
    // if the final score changes, change what the card says & recalculate is stale
    setCardScore(finalScore)
    lastSubmittedFieldRef.current = serviceFieldName
    isLocallyValidatedRef.current = true
  }, [finalScore])
  const submitScore = () => {
    if (submitting || !isStale || !isLocallyValidatedRef.current) return
    submitMutation()
    const handleCompleted = (res: PokerSetFinalScoreMutationResponse, errors) => {
      onCompleted(res as any, errors)
      const {pokerSetFinalScore} = res
      const {error} = pokerSetFinalScore
      if (error?.message.includes(SprintPokerDefaults.JIRA_FIELD_UPDATE_ERROR)) {
        openPortal()
      }
      if (!error) {
        // set field A to 1, change fields to B, then submit again. it should not say update
        lastSubmittedFieldRef.current = serviceFieldName
        forceUpdate()
      }
    }
    PokerSetFinalScoreMutation(
      atmosphere,
      {finalScore: cardScore, meetingId, stageId},
      {onError, onCompleted: handleCompleted}
    )
  }

  useResizeFontForElement(inputRef, cardScore, 12, 18)

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {value} = e.target
    if (serviceFieldType === 'number') {
      // isNaN says "3." is a number, so we stringify the parsed number & see if it matches
      if (String(parseFloat(value)) !== value) {
        // the service wants a number but we didn't get one
        onError(new Error('The field selected only accepts numbers'))
        isLocallyValidatedRef.current = false
      } else {
        isLocallyValidatedRef.current = true
        onCompleted()
      }
    } else {
      isLocallyValidatedRef.current = true
    }
    setCardScore(value)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // keydown required because escape doesn't fire onKeyPress
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      submitScore()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setCardScore(finalScore)
      inputRef.current?.blur()
      isLocallyValidatedRef.current = true
    }
  }
  const isDesktop = useBreakpoint(Breakpoint.SIDEBAR_LEFT)
  const matchingScale = scaleValues.find((scaleValue) => scaleValue.label === cardScore)
  const scaleColor = matchingScale?.color
  const textColor = scaleColor ? '#fff' : undefined
  const isFinal = !!finalScore && cardScore === finalScore
  const isJira = task?.integration?.__typename === 'JiraIssue'
  const handleLabelClick = () => inputRef.current!.focus()
  const label = isDesktop && !finalScore ? 'Final Score (set by facilitator)' : 'Final Score'
  return (
    <ControlWrap>
      <Control>
        <MiniPokerCard canEdit={isFacilitator} color={scaleColor} isFinal={isFinal}>
          <Input
            disabled={!isFacilitator}
            onKeyDown={onKeyDown}
            autoFocus={!finalScore}
            color={textColor}
            ref={inputRef}
            onChange={onChange}
            placeholder={placeholder}
            value={cardScore}
            maxLength={3}
          />
        </MiniPokerCard>
        {!isFacilitator && <Label>{label}</Label>}
        {isJira && (
          <PokerDimensionFinalScoreJiraPicker
            canUpdate={isStale}
            stage={stage}
            error={errorStr}
            submitScore={submitScore}
            clearError={onCompleted}
            inputRef={inputRef}
            isFacilitator={isFacilitator}
          />
        )}
        {!isJira && isFacilitator && (
          <>
            {isStale ? (
              <>
                <StyledLinkButton onClick={submitScore}>{'Update'}</StyledLinkButton>
                {errorStr && <ErrorMessage>{errorStr}</ErrorMessage>}
              </>
            ) : (
              <StyledLinkButton onClick={handleLabelClick}>{'Edit Score'}</StyledLinkButton>
            )}
          </>
        )}
      </Control>
      {modalPortal(
        <AddMissingJiraFieldModal
          stage={stage}
          submitScore={submitScore}
          closePortal={closePortal}
        />
      )}
    </ControlWrap>
  )
}

export default createFragmentContainer(PokerDimensionValueControl, {
  stage: graphql`
    fragment PokerDimensionValueControl_stage on EstimateStage {
      ...PokerDimensionFinalScoreJiraPicker_stage
      ...AddMissingJiraFieldModal_stage
      id
      meetingId
      teamId
      finalScore
      serviceField {
        name
        type
      }
      task {
        integration {
          __typename
        }
      }
      dimensionRef {
        scale {
          values {
            label
            color
          }
        }
      }
    }
  `
})
