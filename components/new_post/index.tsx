// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {AnyAction, bindActionCreators, Dispatch} from 'redux';

import {showActionsDropdownPulsatingDot} from 'selectors/actions_menu';
import {setActionsMenuInitialisationState} from 'mattermost-redux/actions/preferences';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getPost, makeGetCommentCountForPost} from 'mattermost-redux/selectors/entities/posts';

import {
    get,
    getBool,
    isCollapsedThreadsEnabled,
} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeam, getCurrentTeamId, getTeam, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';
import {getUser} from 'mattermost-redux/selectors/entities/users';

import {Emoji} from '@mattermost/types/emojis';
import {Post} from '@mattermost/types/posts';
import {closeRightHandSide, selectPost, selectPostCardFromRightHandSideSearch} from 'actions/views/rhs';

import {markPostAsUnread, emitShortcutReactToLastPostFrom} from 'actions/post_actions';

import {getShortcutReactToLastPostEmittedFrom, getOneClickReactionEmojis} from 'selectors/emojis';
import {getIsPostBeingEditedInRHS, isEmbedVisible} from 'selectors/posts';
import {getHighlightedPostId, getRhsState} from 'selectors/rhs';
import {getIsMobileView} from 'selectors/views/browser';

import {GlobalState} from 'types/store';

import {isArchivedChannel} from 'utils/channel_utils';
import {areConsecutivePostsBySameUser, shouldShowActionsMenu} from 'utils/post_utils';
import {Preferences, RHSStates} from 'utils/constants';

import {ExtendedPost, removePost} from 'mattermost-redux/actions/posts';
import {DispatchFunc, GetStateFunc} from 'mattermost-redux/types/actions';
import {isThreadOpen} from 'selectors/views/threads';

import {General} from 'mattermost-redux/constants';

import PostComponent from './post_component';

interface OwnProps {
    post: Post;
    previousPostId?: string;
    postId?: string;
    teamId: string;
}

function isFirstReply(post: Post, previousPost?: Post | null): boolean {
    if (post.root_id) {
        if (previousPost) {
            // Returns true as long as the previous post is part of a different thread
            return post.root_id !== previousPost.id && post.root_id !== previousPost.root_id;
        }

        // The previous post is not a real post
        return true;
    }

    // This post is not a reply
    return false;
}

function isConsecutivePost(state: GlobalState, ownProps: OwnProps) {
    const post = ownProps.post || getPost(state, ownProps.postId);
    const previousPost = ownProps.previousPostId && getPost(state, ownProps.previousPostId);

    let consecutivePost = false;

    if (previousPost) {
        consecutivePost = areConsecutivePostsBySameUser(post, previousPost);
    }
    return consecutivePost;
}

function removePostAndCloseRHS(post: ExtendedPost) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState() as GlobalState;
        if (isThreadOpen(state, post.id)) {
            dispatch(closeRightHandSide());
        }
        return dispatch(removePost(post));
    };
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const post = ownProps.post || getPost(state, ownProps.postId);
    const config = getConfig(state);
    const enableEmojiPicker = config.EnableEmojiPicker === 'true';
    const enablePostUsernameOverride = config.EnablePostUsernameOverride === 'true';
    const teamId = ownProps.teamId || getCurrentTeamId(state);
    const channel = state.entities.channels.channels[post.channel_id];
    const shortcutReactToLastPostEmittedFrom = getShortcutReactToLastPostEmittedFrom(state);
    const getReplyCount = makeGetCommentCountForPost();

    const user = getUser(state, post.user_id);
    const isBot = Boolean(user && user.is_bot);
    const highlightedPostId = getHighlightedPostId(state);
    const showActionsMenuPulsatingDot = showActionsDropdownPulsatingDot(state);

    let emojis: Emoji[] = [];
    const oneClickReactionsEnabled = get(state, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.ONE_CLICK_REACTIONS_ENABLED, Preferences.ONE_CLICK_REACTIONS_ENABLED_DEFAULT) === 'true';
    if (oneClickReactionsEnabled) {
        emojis = getOneClickReactionEmojis(state);
    }

    let previousPost = null;
    if (ownProps.previousPostId) {
        previousPost = getPost(state, ownProps.previousPostId);
    }

    let previousPostIsComment = false;

    if (previousPost && !post.props.priority) {
        previousPostIsComment = Boolean(previousPost.root_id);
    }

    const currentTeam = getCurrentTeam(state);
    let teamName = currentTeam.name;
    let teamDisplayName = '';

    const memberships = getTeamMemberships(state);
    const isDMorGM = channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL;
    const rhsState = getRhsState(state);
    if (
        rhsState !== RHSStates.PIN && // Not show in pinned posts since they are all for the same channel
        !isDMorGM && // Not show for DM or GMs since they don't belong to a team
        memberships && Object.values(memberships).length > 1 // Not show if the user only belongs to one team
    ) {
        const team = getTeam(state, channel.team_id);
        teamDisplayName = team?.display_name;
        teamName = team?.name || currentTeam.name;
    }

    const canReply = isDMorGM || (channel.team_id === currentTeam.id);

    const previewCollapsed = get(
        state,
        Preferences.CATEGORY_DISPLAY_SETTINGS,
        Preferences.COLLAPSE_DISPLAY,
        Preferences.COLLAPSE_DISPLAY_DEFAULT,
    );

    const previewEnabled = getBool(
        state,
        Preferences.CATEGORY_DISPLAY_SETTINGS,
        Preferences.LINK_PREVIEW_DISPLAY,
        Preferences.LINK_PREVIEW_DISPLAY_DEFAULT === 'true',
    );

    return {
        enableEmojiPicker,
        enablePostUsernameOverride,
        isEmbedVisible: isEmbedVisible(state, post.id),
        isReadOnly: false,
        teamId,
        isFirstReply: previousPost ? isFirstReply(post, previousPost) : false,
        hasReplies: getReplyCount(state, post) > 0,
        replyCount: getReplyCount(state, post),
        canReply,
        pluginPostTypes: state.plugins.postTypes,
        channelIsArchived: isArchivedChannel(channel),
        isConsecutivePost: isConsecutivePost(state, ownProps),
        previousPostIsComment,
        isFlagged: get(state, Preferences.CATEGORY_FLAGGED_POST, post.id, null) != null,
        compactDisplay: get(state, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.MESSAGE_DISPLAY, Preferences.MESSAGE_DISPLAY_DEFAULT) === Preferences.MESSAGE_DISPLAY_COMPACT,
        colorizeUsernames: get(state, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.COLORIZE_USERNAMES, Preferences.COLORIZE_USERNAMES_DEFAULT) === 'true',
        shouldShowActionsMenu: shouldShowActionsMenu(state, post),
        showActionsMenuPulsatingDot,
        shortcutReactToLastPostEmittedFrom,
        isBot,
        collapsedThreadsEnabled: isCollapsedThreadsEnabled(state),
        shouldHighlight: highlightedPostId === post.id,
        oneClickReactionsEnabled,
        recentEmojis: emojis,
        isCollapsedThreadsEnabled: isCollapsedThreadsEnabled(state),
        isExpanded: state.views.rhs.isSidebarExpanded,
        isPostBeingEdited: getIsPostBeingEditedInRHS(state, post.id),
        isMobileView: getIsMobileView(state),
        previewCollapsed,
        previewEnabled,
        post,
        channelName: channel.display_name,
        channelType: channel.type,
        teamDisplayName,
        teamName,
    };
}

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
    return {
        actions: bindActionCreators({
            markPostAsUnread,
            emitShortcutReactToLastPostFrom,
            setActionsMenuInitialisationState,
            selectPost,
            removePost: removePostAndCloseRHS,
            closeRightHandSide,
            selectPostCard: selectPostCardFromRightHandSideSearch,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostComponent);
