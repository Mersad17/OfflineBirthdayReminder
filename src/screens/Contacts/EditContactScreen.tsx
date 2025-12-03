import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ContactsStackParamList } from "../../navigation/ContactsStack";
import {  useEffect, useRef, useState } from "react";
import { CreateContactInput } from "../../contacts/types";
import { fetchContactById, updateContact } from "../../contacts/api";
import { ActivityIndicator, Alert, View,Text, ScrollView, TextInput,StyleSheet, TouchableOpacity, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

type Props = NativeStackScreenProps<ContactsStackParamList, "EditContact">;

export default function EditContactScreen({route,navigation}: Props){
    const {contactId} = route.params;
    const [loading,setLoading]= useState(true);
    const [saving,setSaving] = useState(false);
    const [contact,setContact]= useState<CreateContactInput| null>(null);

    const [firstName,setFirstName] = useState("");
    const [lastName,setLastName] = useState("");
    const [birthday,setBirthday] = useState("");
    const [birthdayDateObj,setBirthdayDateObj] = useState(new Date());
    const [email,setEmail] = useState("");
    const [phone,setPhone] = useState("");
    const [notes,setNotes] = useState("");

    const scrollRef = useRef<ScrollView |null>(null)

    const [showDatePicker,setShowDatePicker] = useState(false);
    const [error,setError] = useState<string | null>(null);

    useEffect(()=>
    {

        (async()=>{
            try{
                const c = await fetchContactById(contactId);
                setContact(c);
                
                setFirstName(c.first_name||"");
                setLastName(c.last_name||"");
                setBirthday(c.birthday||"");
                setBirthdayDateObj(new Date(birthday));
                setEmail(c.email||"");
                setPhone(c.phone||"");
                setNotes(c.notes||"");
            }catch{
                Alert.alert("Error","Could not load Contact");
            }finally{
                setLoading(false);
            }
            
        })();
    },[contactId]);

    function onDateChange(_:any,selectedDate?:Date){
        if (!selectedDate){
            setShowDatePicker(false);
            return
        }
        setShowDatePicker(false);
        setBirthdayDateObj(selectedDate);
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth()+1).padStart(2,"0");
        const d = String(selectedDate.getDate()).padStart(2,"0");
        setBirthday(`${y}-${m}-${d}`);

        
    }
    async function onSave(){
        setError(null);
        if (!birthday.match(/^\d{4}-\d{2}-\d{2}$/)){
            setError("Birthday date must be in YYYY-MM-DD format.");
            return;
        }
        if(!firstName || !firstName.trim()){
            setError("FirstName Required.")
        }
        setSaving(true);
        try{
            await updateContact(contactId,{
                first_name:firstName,
                last_name:lastName,
                birthday,
                email,
                phone,
                notes,
            });
            navigation.goBack();
        }catch{
            Alert.alert("Error", "Could not update Contact");
        }finally{
            setSaving(false);
        }
    }
    if(loading ||!contact){
        return(
            <View style={styles.center} >
                <ActivityIndicator/>
                <Text style={{marginTop:8}}>Loading...</Text>
            </View>
        )
    }
    return(
        <View style={{flex:1}}>
            <ScrollView ref={scrollRef} contentContainerStyle={styles.page}>
                <View style={styles.headerCard}>
                    <Text style={{fontSize:60}}>🧑‍🤝‍🧑</Text>
                    <Text style={styles.headerContact}>{contact.first_name} {contact.last_name}</Text>
                </View>
                <View style={styles.card}>
                <View style={styles.field}>
                <Text style={styles.label}>First Name</Text>
                <TextInput 
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Contact Name"
                />
                </View>
                <View style={styles.field}>
                <Text style={styles.label}>Last Name</Text>

                <TextInput
                
                style = {styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter contact last name"
                />
                </View>
                <View style={styles.field}>
                    <Text style={styles.label}>Birthday</Text>
                    <TouchableOpacity style={styles.dateButton} 
                    onPress={()=> setShowDatePicker(true)}
                    >
                    <Text style={styles.dateButtonText}>
                        {birthday|| "Pick a date"}
                    </Text>

                    </TouchableOpacity>
                    </View>
                    <View style={styles.field}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="name@exemple.com"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        />
                        </View>              
                        <View style={styles.field}>
                            <Text style={styles.label}>Phone</Text>
                            <TextInput style ={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+33 6 12 34 56 78"
                            keyboardType="phone-pad"
                            />
                        </View>
                        <View style={styles.field}>

                        <Text style={styles.label}>Notes</Text>
                        <TextInput style={styles.input}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Anything to add"
                            autoCapitalize="sentences"
                            multiline
                            textAlignVertical="top"
                            onFocus={()=>
                            {
                                setTimeout(()=>{
                                    scrollRef.current?.scrollToEnd({animated:true})
                                },150);
                            }
                            }
                        />
                        </View>
                        {/*Error Message */}
                        {error &&(
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={[styles.saveButton, saving && {opacity:0.6}]}
                        onPress={onSave}
                        disabled={saving}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving ? "Saving..":"Save Changes"}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={()=>navigation.goBack()}>
                            <Text style={styles.cancelText}>Cancel</Text>

                        </TouchableOpacity>
            </View> 
            </ScrollView>
                    {showDatePicker &&(
                        <DateTimePicker
                        mode="date"
                        value={birthdayDateObj}
                        onChange={onDateChange}
                        display={Platform.OS==="ios"?"spinner":"default"}

                        
                        />

                    )}
        </View>
    )
} 

const styles = StyleSheet.create({
    
    page:{
        padding:18,
        gap:22,
        paddingBottom:30,
    },
    center: {
        flex:1,
        alignItems:"center",
        justifyContent:"center",
    },
    headerCard:{
        padding:24,
        borderRadius:20,
        backgroundColor:"#E5F0FF",
        borderWidth:2,
        borderColor:"#C3D9FF",
        alignItems:"center",
    },
    headerContact:{
        marginTop:8,
        fontSize:22,
        fontWeight:"800",
        color:"#1D4ED8",
    },
    card:{
        backgroundColor:"#FFFFFF",
        borderRadius:16,
        borderWidth:1,
        borderColor:"#E5E7EB",
        padding:16,
        gap:8,
    },
    label:{
        fontSize:14,
        fontWeight:"600",
        color:"#4B5563",
    },
    input:{
        borderWidth:1,
        borderColor:"#CBD5E1",
        borderRadius:10,
        paddingHorizontal:10,
        paddingVertical:8,
        backgroundColor: "#F9FAFB",
        fontSize:16,
    },
    field:{
        gap:4,
    },
    dateButton:{
        marginTop:2,
        borderRadius:10,
        borderWidth:1,
        borderColor: "#C7D2FE",
        backgroundColor: "#EEF2FF",
        paddingVertical:10,
        paddingHorizontal:12,
    },
    dateButtonText:{
        color: "#1D4ED8",
        fontWeight:"800",
    },
    errorBox:{
        backgroundColor:"#FEF2F2",
        borderRadius:10,
        padding:10,
        borderWidth:1,
        borderColor: "#FCA5A5",
    },
    errorText:{
        color: "#B91C1C",
        fontWeight: "600",
    },
    saveButton:{
        marginTop:8,
        backgroundColor: "#1D4ED8",
        paddingVertical:14,
        borderRadius:14,
        alignItems: "center",
        shadowColor: "#1D4ED8",
        shadowOpacity: 0.25,
        shadowOffset: {width:0,height:4},
        shadowRadius:6,
        elevation:4,

    },
    saveButtonText:{
        color:"white",
        fontWeight:"700",
        fontSize:17,
    },
    cancelText:{
        marginTop:8,
        textAlign: "center",
        color: "#6B7280",
    }
});