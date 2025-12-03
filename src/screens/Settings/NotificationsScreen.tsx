import {View,Text} from 'react-native';
import { SettingsStackParamsList } from '../../navigation/SettingsStack';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<SettingsStackParamsList, 'Notifications'>;
export default function NotificationScreen({}:Props){

    return (
        <View>
            <Text>
                Notification screen
            </Text>
        </View>
    )
}