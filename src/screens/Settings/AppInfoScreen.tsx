import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View, Text} from 'react-native';
import { SettingsStackParamsList } from '../../navigation/SettingsStack';

type Props = NativeStackScreenProps<SettingsStackParamsList, "AppInfo">;


export default function AppInfoScreen({}:Props){
    return(
        <View>
            <Text>
                App Info Screen
            </Text>
        </View>
    )
}