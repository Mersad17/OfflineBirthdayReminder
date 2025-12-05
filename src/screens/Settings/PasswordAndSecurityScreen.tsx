import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text }  from 'react-native';
import { SettingsStackParamsList } from '../../navigation/SettingsStack';


type Props = NativeStackScreenProps<SettingsStackParamsList, 'PasswordAndSecurity'>;

export default function PasswordAndSecurityScreen({}:Props){

    return (
        <Text>Password and Security</Text>
    )
}