import { QuestionRow } from "@/components/lists/QuestionRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { useQuery } from "@/hooks/useQuery";
import { searchQuestions } from "@/services/db/content";
import { Stack, useRouter } from "expo-router";
import { useDeferredValue, useState } from "react";
import { FlatList } from "react-native";

export default function Search() {
  const router = useRouter();
  const [text, setText] = useState("");
  const query = useDeferredValue(text.trim());
  const { data: results } = useQuery((db) => searchQuestions(db, query, 60), [query], {
    live: false,
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: "p.sh. fotosinteza, nxitimi, pH",
            autoFocus: true,
            onChangeText: (e) => setText(e.nativeEvent.text),
            hideWhenScrolling: false,
          },
        }}
      />
      <FlatList
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        data={results ?? []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        ListEmptyComponent={
          query ? (
            <EmptyState
              icon="search"
              title="Asnjë rezultat"
              message="Provo fjalë të tjera ose më pak fjalë."
            />
          ) : (
            <EmptyState
              icon="search"
              title="Kërko në fondin e pyetjeve"
              message="Kërko në tekstin e pyetjeve dhe të përgjigjeve. Nuk ka nevojë për ë dhe ç."
            />
          )
        }
        renderItem={({ item }) => (
          <QuestionRow
            text={item.questionText}
            caption={`${item.subject} · ${item.topicTitle} · Pyetja ${item.subId}`}
            onPress={() =>
              router.push({ pathname: "/question/[id]", params: { id: String(item.id) } })
            }
          />
        )}
      />
    </>
  );
}
