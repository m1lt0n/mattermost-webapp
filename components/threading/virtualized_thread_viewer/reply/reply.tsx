// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback} from 'react';

import {useDispatch} from 'react-redux';

import {removePost} from 'mattermost-redux/actions/posts';

import {Post} from '@mattermost/types/posts';

import PostComponent from 'components/new_post';
import {Props as TimestampProps} from 'components/timestamp/timestamp';

type Props = {
    a11yIndex: number;
    currentUserId: string;
    isLastPost: boolean;
    onCardClick: (post: Post) => void;
    post: Post;
    previewCollapsed: string;
    previewEnabled: boolean;
    previousPostId: string;
    teamId: string;
    timestampProps?: Partial<TimestampProps>;
    id?: string;
}

function Reply({
    a11yIndex,
    currentUserId,
    isLastPost,
    onCardClick,
    post,
    id,
    previewCollapsed,
    previewEnabled,
    previousPostId,
    teamId,
    timestampProps,
}: Props) {
    const dispatch = useDispatch();

    const handleRemovePost = useCallback((post: Post) => {
        dispatch(removePost(post));
    }, []);

    return (
        <PostComponent
            a11yIndex={a11yIndex}
            currentUserId={currentUserId}
            handleCardClick={onCardClick}
            isLastPost={isLastPost}
            postId={id}
            post={post}
            previewCollapsed={previewCollapsed}
            previewEnabled={previewEnabled}
            previousPostId={previousPostId}
            removePost={handleRemovePost}
            teamId={teamId}
            timestampProps={timestampProps}
        />
    );
}

export default memo(Reply);
