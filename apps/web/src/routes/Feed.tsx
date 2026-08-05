import { REACTIONS, type ReactionType } from '@luwte/core';
import { Button, Field, Hairline, HumanText, Screen } from '@luwte/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { comment, createPost, react, readFeed, unreact, type PostRecord } from '../firebase/feed';
import { useAuth } from '../providers/AuthProvider';
import { useLocale } from '../providers/LocaleProvider';
import styles from './Feed.module.css';

/**
 * PRD 6.4 — the feed. One patient and their circle, and **not a network**:
 * nothing to discover, no counts, no ordering but time.
 *
 * Reached with no `patientId` as the person's own feed, or with one as
 * someone the person supports. The screen is the same either way, because
 * what a supporter sees is exactly what the patient shared and nothing more.
 *
 * Everything another human wrote or sent renders in `--amber` and in the
 * serif — BRAND 3.4. The person's own data is never amber, and this is the
 * one screen where both appear at once.
 */
export function Feed() {
  const { t } = useLocale();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { patientId } = useParams();

  const owner = patientId ?? user?.uid ?? '';
  const isOwnFeed = owner === user?.uid;

  const [posts, setPosts] = useState<PostRecord[] | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState('');

  const load = () => {
    if (!owner) return;
    void readFeed(owner)
      .then(setPosts)
      .catch(() => setPosts([]));
  };

  useEffect(load, [owner]);

  const share = async () => {
    if (!owner || text.trim().length === 0) return;
    await createPost(owner, { text: text.trim() });
    setText('');
    load();
  };

  const toggleReaction = (post: PostRecord, type: ReactionType) => {
    if (!user) return;
    const mine = post.reactions[user.uid];
    if (mine === type) unreact(owner, post.id, user.uid);
    else react(owner, post.id, user.uid, type);

    setPosts((prev) =>
      (prev ?? []).map((p) =>
        p.id !== post.id
          ? p
          : {
              ...p,
              reactions:
                mine === type
                  ? Object.fromEntries(
                      Object.entries(p.reactions).filter(([uid]) => uid !== user.uid),
                    )
                  : { ...p.reactions, [user.uid]: type },
            },
      ),
    );
  };

  const send = async (postId: string) => {
    if (!user || reply.trim().length === 0) return;
    await comment(owner, postId, user.uid, reply.trim());
    setReply('');
    setReplyTo(null);
    load();
  };

  if (posts === null) return <Screen title={t('feedTitle')}>{null}</Screen>;

  return (
    <Screen
      title={t('feedTitle')}
      action={
        <Button variant="quiet" onClick={() => navigate(isOwnFeed ? '/' : '/following')}>
          {isOwnFeed ? t('navToday') : t('navBack')}
        </Button>
      }
    >
      {isOwnFeed ? (
        <>
          <Field
            label={t('feedWrite')}
            placeholder={t('feedPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button disabled={text.trim().length === 0} onClick={() => void share()}>
            {t('feedPost')}
          </Button>
          <Hairline />
        </>
      ) : null}

      {posts.length === 0 ? (
        <p className={styles.empty}>{t('feedEmpty')}</p>
      ) : (
        <ul className={styles.posts}>
          {posts.map((post) => {
            const mine = user ? post.reactions[user.uid] : undefined;
            return (
              <li key={post.id} className={styles.post}>
                {post.title ? (
                  <span className={styles.title}>
                    {t('feedShared')} · {post.title}
                  </span>
                ) : null}
                {/* What a person wrote, in the serif. Never analysed. */}
                {post.text ? <HumanText>{post.text}</HumanText> : null}

                <div className={styles.reactions}>
                  {REACTIONS.map((reaction) => {
                    const count = Object.values(post.reactions).filter(
                      (type) => type === reaction.id,
                    ).length;
                    return (
                      <button
                        key={reaction.id}
                        type="button"
                        className={styles.reaction}
                        aria-pressed={mine === reaction.id}
                        aria-label={t(reaction.labelKey)}
                        onClick={() => toggleReaction(post, reaction.id)}
                      >
                        {t(reaction.labelKey)}
                        {count > 0 ? <span className={styles.count}> {count}</span> : null}
                      </button>
                    );
                  })}
                </div>

                {post.comments.map((entry) => (
                  <p key={entry.id} className={styles.comment}>
                    <HumanText>{entry.text}</HumanText>
                  </p>
                ))}

                {replyTo === post.id ? (
                  <>
                    <Field
                      label={t('feedComment')}
                      placeholder={t('feedCommentPlaceholder')}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <Button
                      variant="quiet"
                      disabled={reply.trim().length === 0}
                      onClick={() => void send(post.id)}
                    >
                      {t('feedCommentSend')}
                    </Button>
                  </>
                ) : (
                  <Button variant="quiet" onClick={() => setReplyTo(post.id)}>
                    {t('feedComment')}
                  </Button>
                )}

                <Hairline />
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
