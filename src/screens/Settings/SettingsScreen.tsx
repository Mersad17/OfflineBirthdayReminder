import React from "react";
import { View, Text, Button, Alert, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Settings">
export default function SettingsScreen({navigation}:Props) {
  const { logout } = useAuth();


  return (
    <ScrollView>
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <TouchableOpacity
      onPress={()=>navigation.navigate("Profile")}
      >
        <Text style={{fontSize:18, fontWeight:'600'}}>
      Profile
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
      onPress={()=>navigation.navigate('Appearance')}
      >

      <Text style={{fontSize:18,fontWeight:'500'}}>Appereance</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={()=> navigation.navigate('Notifications')}>
        <Text style={{fontSize:18, fontWeight:'500'}}>Notifications</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={()=>navigation.navigate("AppInfo")}>
        <Text style={{fontSize:18, fontWeight:"500"}}>AppInfo</Text>
      </TouchableOpacity>
      <Button title="Logout" onPress={logout} />
    </View>
        </ScrollView>
  );
}
