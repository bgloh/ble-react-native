import React, {Component} from 'react';
import { StyleSheet, Text, View, Platform, Button, TouchableOpacity, ActivityIndicator  } from 'react-native';
import { ToastAndroid  } from 'react-native';

import { BleManager } from "react-native-ble-plx"
// ...
const manager = new BleManager()

export default class  App extends Component {
  constructor() {
    super()
    this.manager = new BleManager()
    this.state = {info: "", values: {}, devices : [], deleteDevices : [], count : 0, opacity:0}
    this.prefixUUID = "f000aa"
    this.suffixUUID = "-0451-4000-b000-000000000000"
    this.sensors = {
      0: "Temperature",
      1: "Accelerometer",
      2: "Humidity",
      3: "Magnetometer",
      4: "Barometer",
      5: "Gyroscope"
    }
  }

  serviceUUID(num) {
    return this.prefixUUID + num + "0" + this.suffixUUID
  }

  notifyUUID(num) {
    return this.prefixUUID + num + "1" + this.suffixUUID
  }

  writeUUID(num) {
    return this.prefixUUID + num + "2" + this.suffixUUID
  }

  info(message) {
    this.setState({info: message})
  }

  error(message) {
    this.setState({info: "ERROR: " + message})
  }

  updateValue(key, value) {
    this.setState({values: {...this.state.values, [key]: value}})
    console.log(this.state.values);
  }

  // store devices
  storeDevices = (devices,device) => {
    if (devices.length != 0){
      if (!devices.map(d=>d.id).includes(device.id) && device.name != null)
      {
        console.log('new device:' + device.name);
        this.setState({devices : devices.concat(device)});
      }
         
    }
    else{
          console.log('first scanned device: '+ device.name);
          this.setState({devices : devices.concat(device)});
    }
  }

  stopScan = ()=>{
    this.manager.stopDeviceScan();
    this.info('Stop scanning ....');
  }

  selectAndConnect = (item) =>{ 
    ToastAndroid.showWithGravity(
      item + ' is selected .', ToastAndroid.SHORT, ToastAndroid.CENTER);
    // device name to connect  
    let nameOfDevice2Connect = 'SensorTag';
    let foundDevice = false;
    if (item === 'null')
        ; // Do Nothing
    else if(item === nameOfDevice2Connect)
      {
        device2Connect = this.state.devices.find(device=>device.name === nameOfDevice2Connect);
        foundDevice = true;
      }
    
    if (foundDevice)
    {
      this.manager.stopDeviceScan()
      device2Connect.connect()
        .then((device) => {
          this.info("Discovering services and characteristics")
          return device.discoverAllServicesAndCharacteristics()
        })
        .then((device) => {
          this.info("Setting notifications")
          return this.setupNotifications(device)
        })
        .then(() => {
          this.info("Listening...")
        }, (error) => {
          this.error(error.message)
        })  
    }
  };



  componentWillMount() {
    if (Platform.OS === 'ios') {
      this.manager.onStateChange((state) => {
        if (state === 'PoweredOn') this.scanAndConnect()
      })
    } else {
      //this.scanAndConnect()
     this.scan()
      // flush found list every 60 seconds
    setInterval(()=>this.setState({devices: [] }), 60000)
      // start ActivityIndicator
      this.setState({opacity : 1});
    }
  }

  scan() {
    this.manager.startDeviceScan(null,
                                 null, (error, device) => {
      this.info("Scanning... from scan method")
      //stop Activity Indicator
      this.setState({opacity : 0});

      if (error) {
        this.error(error.message)
        return
      }

      this.storeDevices(this.state.devices,device);

      //setTimeout(this.manager.stopDeviceScan(), 30000);


    });
  }

  scanAndConnect() {
    this.manager.startDeviceScan(null,
                                 null, (error, device) => {
      this.info("Scanning...")
      //console.log(device)

      if (error) {
        this.error(error.message)
        return
      }

      this.storeDevices(this.state.devices,device);

      if (device.name === 'TI BLE Sensor Tag' || device.name === 'SensorTag') {
        this.info("Connecting to TI Sensor")
        this.manager.stopDeviceScan()
        device.connect()
          .then((device) => {
            this.info("Discovering services and characteristics")
            return device.discoverAllServicesAndCharacteristics()
          })
          .then((device) => {
            this.info("Setting notifications")
            return this.setupNotifications(device)
          })
          .then(() => {
            this.info("Listening...")
          }, (error) => {
            this.error(error.message)
          })
      } 
    });
  }

  async setupNotifications(device) {
    for (const id in this.sensors) {
      const service = this.serviceUUID(id)
      const characteristicW = this.writeUUID(id)
      const characteristicN = this.notifyUUID(id)

      const characteristic = await device.writeCharacteristicWithResponseForService(
        service, characteristicW, "AQ==" /* 0x01 in hex */
      )

      device.monitorCharacteristicForService(service, characteristicN, (error, characteristic) => {
        if (error) {
          this.error(error.message)
          return
        }
        this.updateValue(characteristic.uuid, characteristic.value)
      })
    }
  }

render(){
  return (
    <View style={styles.container}>

    <View style={styles.info}>
      <Text>{this.state.info}</Text>
      <ActivityIndicator size="large" opacity={this.state.opacity} ></ActivityIndicator>
    </View>  

    <View style={styles.dataList}>
    {Object.keys(this.sensors).map((key) => {
      return <Text key={key}>
               {this.sensors[key] + ": " + (this.state.values[this.notifyUUID(key)] || "-")}
             </Text>
    })}
    </View>
    
    <View style={styles.deviceList}>
      <Text style={{textAlign:'center', fontWeight:'bold'}}>SCANNED DEVICES</Text>
      {this.state.devices.map(device => {
        return  <TouchableOpacity  key={device.id} onPress={()=>this.selectAndConnect(device.name)}>
                  <Text>
                      {device.name + ": " + device.id}
                  </Text>
                </TouchableOpacity>
       })}
    </View>

    <View style={styles.buttonGroup}>
        <TouchableOpacity onPress={()=>this.scanAndConnect()}>
          <Text style={{textAlign:'center',fontSize:10}}>SCAN AND CONNECT</Text>
        </TouchableOpacity>
    </View>
    


  </View>
  );
}
  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  //  alignItems: 'center',
  //  justifyContent: 'center',
  },
  buttonGroup :{
    flex : 0.5,
    backgroundColor : '#bdc3c7',borderRadius : 10, 
    flexDirection: 'column',
    justifyContent: 'space-around',
    margin : 5,padding : 5,
  },
  deviceList : {
    flex : 2, margin : 5, padding : 5, borderColor : 'orange',
    borderRadius : 5, borderWidth :1
  },
  dataList : {
    flex :2,
    margin:5,
    padding: 5,
  },
  info :{
    flex: 1,
    margin : 5,
    padding : 5,
  }
});