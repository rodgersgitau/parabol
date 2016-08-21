import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import {cashay} from 'cashay';
import {TEAM_DASH, USER_DASH} from 'universal/utils/constants';
import {getAuthQueryString, authedOptions} from 'universal/redux/getAuthedUser';
import TeamProjectCardContainer from 'universal/modules/teamDashboard/containers/TeamProjectCard/TeamProjectCardContainer';

const mapStateToProps = (state, props) => {
  const {id, preferredName} = cashay.query(getAuthQueryString, authedOptions).data;
  const [teamId] = props.project.id.split('::');
  const username = preferredName.replace(/\s+/g, '');
  const myTeamMemberId = `${id}::${teamId}`;
  return {
    username,
    myTeamMemberId
  };
};

const ProjectCardContainer = (props) => {
  const {area, myTeamMemberId, project, username} = props;
  const {content, id, status, teamMemberId} = project;
  if (!content && myTeamMemberId !== teamMemberId) {
    return <NullCard username={username}/>
  }
  if (area === USER_DASH) {
    return (
      <UserProjectCardContainer
      />
    )
  }
  if (area === TEAM_DASH) {
    const form = `${status}::${id}`
    return (
      <TeamProjectCardContainer
        form={form}
        project={project}
        dispatch={dispatch}
        editing={editing}
        teamId={teamId}
        teamMemberId={teamMemberId}
        teamMembers={teamMembers}
        updatedAt={updatedAt}
      />
  }
};

ProjectCardContainer.propTypes = {
  project: PropTypes.shape({
    id: PropTypes.string,
    content: PropTypes.string,
    status: PropTypes.string,
    teamMemberId: PropTypes.string
  })
};

export default connect(mapStateToProps)(ProjectCardContainer);
