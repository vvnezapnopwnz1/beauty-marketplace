import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage } from '../../api/chat';

interface Props {
  msg: ChatMessage;
  isOwn: boolean;
}

export function ChatBubble({ msg, isOwn }: Props) {
  if (msg.isSystem) {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.system}>{msg.body}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.bubble, isOwn ? styles.own : styles.other]}>
      <Text style={isOwn ? styles.ownText : styles.otherText}>{msg.body}</Text>
      <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 8, marginVertical: 2 },
  own: { alignSelf: 'flex-end', backgroundColor: '#7c3aed' },
  other: { alignSelf: 'flex-start', backgroundColor: '#eee' },
  ownText: { color: 'white' },
  otherText: { color: 'black' },
  time: { fontSize: 10, marginTop: 2 },
  timeOwn: { color: 'rgba(255,255,255,0.7)' },
  timeOther: { color: 'rgba(0,0,0,0.5)' },
  systemWrap: { alignSelf: 'center', marginVertical: 4 },
  system: { fontStyle: 'italic', color: '#666', fontSize: 12 },
});
