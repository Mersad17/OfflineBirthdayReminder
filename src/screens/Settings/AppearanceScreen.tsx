import { View ,Text} from "react-native";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Appearance">
export default function AppereanceScreen(){
    return(
        <View>
            <Text>
                Appereance Screen
            </Text>
        </View>
    )
}