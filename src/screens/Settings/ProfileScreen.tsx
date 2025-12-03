import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { Text } from "react-native"
import { SettingsStackParamsList } from "../../navigation/SettingsStack"

type Props = NativeStackScreenProps<SettingsStackParamsList, "Profile">

export default function ProfileScreen({route,navigation}:Props){
    return(
        <Text>Profile</Text>
    )
}