import { FlatList, StyleSheet, View } from 'react-native';
import { useRef, useCallback } from 'react';
import { spacing } from '../../tokens/spacing';
import type { Message } from './types';
import UserMessageRenderer from './messages/UserMessage';
import TextMessageRenderer from './messages/TextMessage';
import ToolMessageRenderer from './messages/ToolMessage';
import MemoryMessageRenderer from './messages/MemoryMessage';
import CodeMessageRenderer from './messages/CodeMessage';
import ErrorMessageRenderer from './messages/ErrorMessage';
import ProgressMessageRenderer from './messages/ProgressMessage';
import ConversationEmpty from './ConversationEmpty';

type Props = {
  messages: Message[];
  streamingId: string | null;
  onSuggestionTap: (text: string) => void;
  isLoaded: boolean;
  ListEmptyComponent?: React.ReactElement | null;
};

export default function MessageList({ messages, streamingId, onSuggestionTap, isLoaded }: Props) {
  const flatListRef = useRef<FlatList>(null);
  const isNearBottomRef = useRef(true);

  const onScroll = useCallback((e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom < 100;
  }, []);

  const onContentSizeChange = useCallback(() => {
    if (isNearBottomRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    switch (item.type) {
      case 'user':
        return <UserMessageRenderer content={item.content} timestamp={item.timestamp} />;
      case 'text':
        return (
          <TextMessageRenderer
            content={item.content}
            isStreaming={item.isStreaming}
            timestamp={item.timestamp}
          />
        );
      case 'tool':
        return <ToolMessageRenderer name={item.tool.name} status={item.tool.status} detail={item.tool.detail} />;
      case 'memory':
        return <MemoryMessageRenderer memory={item.memory} />;
      case 'code':
        return <CodeMessageRenderer language={item.language} code={item.code} />;
      case 'error':
        return <ErrorMessageRenderer content={item.content} />;
      case 'progress':
        return <ProgressMessageRenderer stages={item.stages} />;
      default:
        return null;
    }
  }, []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      onContentSizeChange={onContentSizeChange}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <ConversationEmpty onSuggestionTap={onSuggestionTap} isLoaded={isLoaded} />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.space16,
    flexGrow: 1,
  },
});
