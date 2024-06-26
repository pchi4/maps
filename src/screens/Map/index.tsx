import React, { useEffect, useRef, useState } from "react";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  AnimatedRegion,
  MapCallout,
} from "react-native-maps";
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  Platform,
  Image,
  LogBox,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import { requestForegroundPermissionsAsync } from "expo-location";
import {
  GooglePlaceDetail,
  GooglePlacesAutocomplete,
} from "react-native-google-places-autocomplete";
import MapViewDirections, { Callout } from "react-native-maps-directions";
const { width, height } = Dimensions.get("window");
import { Error } from "../../components/Erro";
import { useGetCurrentLocation } from "../../hooks";
import { styles } from "./style";
import { Info } from "../../components/Info";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

interface IObject {
  text: string;
  value: number | null;
}
interface IDeailsCoord {
  distance: IObject;
  durantion: IObject;
  end_address: string;
  start_address: string;
}

export const Map = ({ navigation }) => {
  const aspect = width / height;
  const latitude_delta = 0.0922;
  const longitude_delta = latitude_delta * aspect;
  const mapRef = useRef();
  const markerRef = useRef();

  const [isGranted, setIsGranted] = useState(null);
  const [location, setLocation] = useState({
    currentLocation: { latitude: -12.9166572, longitude: -38.458494 },
    destinationCords: { latitude: 0, longitude: 0 },
    isLoading: true,
    coordinate: new AnimatedRegion({
      latitude: -12.9166572,
      longitude: -38.458494,
      latitudeDelta: latitude_delta,
      longitudeDelta: longitude_delta,
    }),
    time: 0,
    distance: 0,
    heading: 0,
  });

  const [detailsCoord, setDetailsCoord] = useState<IDeailsCoord>({
    distance: { text: "", value: null },
    duration: { text: "", value: null },
    end_address: "",
    start_address: "",
  });

  const [cards] = useState([
    { title: "Casa", icon: require("../../assets/house.png") },
    { title: "Trabalho", icon: require("../../assets/work.png") },
    { title: "Favoritos", icon: require("../../assets/house.png") },
  ]);

  const { getCurrentLocation } = useGetCurrentLocation();

  const updateState = (data) => setLocation((value) => ({ ...value, ...data }));
  const updateStateDetails = (data) =>
    setDetailsCoord((value) => ({ ...value, ...data }));

  const { coordinates, currentLocation, destinationCords } = location;

  async function requestPermision() {
    try {
      const { granted } = await requestForegroundPermissionsAsync();

      setIsGranted(granted);
      if (granted) {
        const { latitude, longitude, heading } = await getCurrentLocation();

        updateState({
          heading: heading,
          currentLocation: { latitude, longitude },
          coordinates: new AnimatedRegion({
            latitude,
            longitude,
            latitudeDelta: latitude_delta,
            longitudeDelta: longitude_delta,
          }),
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      requestPermision();
      centerlizeCurrentPosition();
    }, [])
  );

  useEffect(() => {
    if (destinationCords.latitude >= 0) {
      mapRef.current?.animateCamera({
        center: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: latitude_delta,
          longitudeDelta: longitude_delta,
        },
      });
    }
  }, [currentLocation.latitude]);

  useEffect(() => {
    const interval = setInterval(() => {
      requestPermision();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const animate = (latitude: any, longitude: any) => {
    const newCoordinate = { latitude, longitude };
    if (Platform.OS == "android") {
      if (markerRef?.current) {
        markerRef?.current?.animateMarkerToCoordinate(newCoordinate, 7000);
      }
    } else {
      coordinates?.timing(newCoordinate).start();
    }
  };

  function moveToLocation(
    latitude: number | undefined,
    longitude: number | undefined
  ) {
    mapRef?.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: latitude_delta,
      longitudeDelta: longitude_delta,
    });
  }

  const onReadyFit = (result: object) => {
    result.legs.forEach((element: IDeailsCoord) => {
      updateStateDetails({
        distance: element.distance,
        duration: element.duration,
        end_address: element.end_address,
        start_address: element.start_address,
      });
    });

    mapRef.current?.fitToCoordinates(result?.coordinates, {
      edgePadding: {
        right: width / 10,
        bottom: height / 10,
        left: width / 10,
        top: height / 10,
      },
    });
  };

  const onPressAddress = (details: GooglePlaceDetail | null) => {
    updateState({
      destinationCords: {
        latitude: details?.geometry?.location.lat,
        longitude: details?.geometry?.location.lng,
      },
    });
    moveToLocation(
      details?.geometry?.location.lat,
      details?.geometry?.location.lng
    );
  };

  const centerlizeCurrentPosition = () => {
    moveToLocation(currentLocation.latitude, currentLocation.longitude);
  };

  if (!isGranted) {
    return <Error handleGoHome={() => navigation.navigate("Home")} />;
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
      }}
    >
      <View style={styles.container}>
        {location && (
          <MapView
            provider={PROVIDER_GOOGLE}
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              ...currentLocation,
              latitudeDelta: latitude_delta,
              longitudeDelta: longitude_delta,
            }}
          >
            {coordinates && (
              <Marker.Animated ref={markerRef} coordinate={coordinates}>
                {!Object.values(destinationCords).includes(0) && (
                  <MapCallout tooltip={false}>
                    <Info
                      distance={detailsCoord?.duration?.text}
                      address={detailsCoord.start_address}
                    />
                  </MapCallout>
                )}
              </Marker.Animated>
            )}

            {!Object.values(destinationCords).includes(0) && (
              <Marker coordinate={destinationCords}>
                <MapCallout tooltip={false}>
                  <Info
                    distance={detailsCoord?.distance?.text}
                    address={detailsCoord.end_address}
                  />
                </MapCallout>
              </Marker>
            )}

            {!Object.values(destinationCords).includes(0) && (
              <MapViewDirections
                origin={currentLocation}
                destination={destinationCords}
                optimizeWaypoints={true}
                apikey="AIzaSyDvNypCJVAfgPJ1nmrqZvz25wSbW3JOjUc"
                strokeColor="purple"
                strokeWidth={4}
                language="pt-br"
                onReady={(result) => onReadyFit(result)}
                onStart={(params) => {
                  console.log(
                    `Started routing between "${params.origin}" and "${params.destination}"`
                  );
                }}
                onError={(value) => Alert.alert("Rota não encontrada", value)}
              />
            )}
          </MapView>
        )}
        <View style={styles.containerSearch}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={styles.titel}>Selecione um local</Text>
            <View
              style={{
                backgroundColor: "#89C2D9",
                padding: 12,
                borderRadius: 20,
              }}
            >
              <TouchableOpacity onPress={() => navigation.popToTop()}>
                <Image
                  width={24}
                  alt="a"
                  source={require("../../assets/arrow_back.png")}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={{
              backgroundColor: "transparent",
              paddingHorizontal: 12,
              paddingTop: 10,
            }}
          >
            <GooglePlacesAutocomplete
              placeholder="Digite um endereço..."
              fetchDetails={true}
              styles={{ backgroundColor: "#FFFFFF" }}
              onPress={(data, details = null) => {
                onPressAddress(details);
              }}
              query={{
                key: "AIzaSyDvNypCJVAfgPJ1nmrqZvz25wSbW3JOjUc",
                language: "pt-br",
                components: "country:br",
              }}
              debounce={300}
            />
          </View>
          <View style={styles.containerCards}>
            {cards.map((card, idx) => (
              <View key={idx} style={styles.card}>
                <Image
                  source={card.icon}
                  width={32}
                  style={{ marginRight: 6 }}
                />
                <Text style={{ color: "#2A6F97" }}>{card.title}</Text>
              </View>
            ))}
          </View>
        </View>
        <TouchableOpacity onPress={centerlizeCurrentPosition}>
          <View style={styles.button}>
            <Image
              style={{ alignItems: "center" }}
              source={require("../../assets/gps_fixed.png")}
            />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
