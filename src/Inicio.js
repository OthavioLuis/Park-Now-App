import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';

const TelaInicial = ({ onStartPress }) => {
    const logoPosition = useRef(new Animated.Value(0)).current;
    const [logoImage, setLogoImage] = React.useState(require('../assets/carro-logo.png'));

    useEffect(() => {
        Animated.timing(logoPosition, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
        }).start(() => {
            setLogoImage(require('../assets/logo.png'));
        });
    }, [logoPosition]);

    const translateX = logoPosition.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 0],
    });

    return (
        <View style={styles.container}>
            <Animated.Image
                source={logoImage}
                style={[styles.logo, { transform: [{ translateX }] }]}
            />
            <Text style={styles.logoText}>Park Now</Text>

            <TouchableOpacity style={styles.button} onPress={onStartPress}>
                <Text style={styles.buttonText}>Ir para o Login</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    logo: {
        width: 200,
        height: 200,
        marginBottom: 20,
    },
    logoText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#261419',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#f25c05',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 8,
        
        // Sombra para iOS
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,

        // Sombra para Android
        elevation: 5,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
    },
});


export default TelaInicial;
