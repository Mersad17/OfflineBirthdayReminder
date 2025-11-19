import React, { useState } from "react";
import { View, Text, FlatList, RefreshControl, Button, TouchableOpacity } from "react-native";
import { fetchContacts } from "../../contacts/api";
import { Contact } from "../../contacts/types";

export default function ContactScreen({navigation}:any){
    const [contacts,setContacts] = React.useState<Contact[]>([]);
    const [loading,setLoading] = React.useState(false);
    const [refreshing,setRefreshing] = React.useState(false);

    async function load(){
        setLoading(true);
        try {
            const data = await fetchContacts();
            // sort A→Z by last_name for a consistent UI
            data.sort((a, b) => a.last_name.localeCompare(b.last_name));
            setContacts(data);
          } catch {
            // keep it simple for now
            alert("Failed to load contacts");
          } finally {
            setLoading(false);
          }
    }
    React.useEffect(() => {
        load();
      }, []);
    
      async function onRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }
    
      return (

        <View style={{ flex: 1 }}>
          <View style={{ padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "600" }}>Contacts</Text>
            <Button title="Add" onPress={() => navigation.navigate("AddContact")} />
          </View>
    
          {contacts.length === 0 && !loading ? (
            <View style={{ padding: 16 }}>
              <Text>No contacts yet.</Text>
              <Text style={{ color: "#666", marginTop: 4 }}>Tap “Add” to create your first contact.</Text>
            </View>
          ) : null}
    
          <FlatList
            data={contacts}
            keyExtractor={(item) => String(item.id)}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => (
              <TouchableOpacity
  onPress={() => navigation.navigate("ContactDetail", { contactId: item.id, contactName: `${item.first_name} ${item.last_name}` })}
                  style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" }}
              >
                <Text style={{ fontWeight: "600" }}>
                  {item.first_name} {item.last_name}
                </Text>
                {item.birthday ? <Text style={{ color: "#666" }}>Birthday: {item.birthday}</Text> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      );
}