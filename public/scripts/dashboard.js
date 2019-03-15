$('#myModal').on('show.bs.modal', function (event) {
    $('#contactInfo').find('.emails').text('');
    $('#contactInfo').find('.phone').text('');
    let modal = $(this)
    let button = $(event.relatedTarget);
    let id = button.data('id');
    let link = button.data('link');
    let name = button.data('pname');
    modal.find('.modal-title').text('Contact Info - ' + name);
    if(id && link){
        callInfo(id,link);
    }
});

function downloadCSV(){
   axios.get('/api/shortlist/dw/csv')
       .then(function (response) {
           window.open(response.data.fileUrl,'_blank');
       })
       .catch(function (err) {
           if(err.response.status === 403){
               swal('', err.response.data.message, 'warning')
           }
       })
}

function callInfo(id,link){
    axios.get('/api/profile/info/' + id)
        .then(function(response){
            let emails = response.data.email.join(', ');
            if(emails){
                $('#contactInfo').find('.emails').text(emails);
            }
            $('#contactInfo').find('.phone').text(response.data.contact);
            $('#contactInfo').show();
        })
        .catch(function(err){
            if(err.response.status === 401){
                $('#getContact').attr('data-link',link);
                $('#getContact').attr('data-id',id);
                $('#getInfo').show();
            }
        });
}

function getInfoHandler(){
    let link = $(this).data('link');
    let id = $(this).data('id');
    if(link && id){
        axios.post('/api/shortlist/updateshortlist',{
            holasearchlink:link
        })
            .then(function (response) {
                $('#getInfo').hide();
                if(id && link){
                    callInfo(id,link);
                }
            })
            .catch(function (err) {
                console.log('Please contact help@holaconnect.com');
            })
    }
}

Vue.filter('formatDate', function(value) {
  if (value) {
    return moment(String(value)).format('DD-MMM-YYYY hh:mm:ss')
  }
});

// register the grid component
Vue.component('data-grid', {
    delimiters: ['${', '}'],
    template: '#grid-template',
    props: {
        data: Array,
        columns: Array,
        filterKey: String
    },
    data: function () {
        let sortOrders = {};
        this.columns.forEach(function (key) {
            sortOrders[key] = 1
        })
        return {
            sortKey: '',
            sortOrders: sortOrders
        }
    },
    computed: {
        filteredData: function () {
            let sortKey = this.sortKey;
            let filterKey = this.filterKey && this.filterKey.toLowerCase();
            let order = this.sortOrders[sortKey] || 1;
            let data = this.data;
            if (filterKey) {
                data = data.filter(function (row) {
                    return Object.keys(row).some(function (key) {
                        return String(row[key]).toLowerCase().indexOf(filterKey) > -1
                    })
                })
            }
            if (sortKey) {
                data = data.slice().sort(function (a, b) {
                    a = a[sortKey];
                    b = b[sortKey];
                    return (a === b ? 0 : a > b ? 1 : -1) * order
                })
            }
            return data
        }
    },
    filters: {
        capitalize: function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1)
        }
    },
    methods: {
        sortBy: function (key) {
            this.sortKey = key;
            this.sortOrders[key] = this.sortOrders[key] * -1
        },

        removeShortList: function(entry){
           let profileId = entry['id'];
            this.data.splice(entry, 1);
            axios.delete('/api/shortlist/' + profileId)
                .then(function(){
                    swal('', `${entry['name']} removed from leads`, 'warning');
                })
                .catch(function(err){
                    console.log('Please contact help@holaconnect.com');
                });


            //
        }

    }
});

// bootstrap the demo
let vm = new Vue({
    delimiters: ['${', '}'],
    el: '#datagrid',
    data: {
        searchQuery: '',
        gridColumns: ['','name', 'headline', 'location', 'profiles', 'tags', 'note', 'updated','contact'],
        gridData: [],
        startRow: 0,
        rowsPerPage: 10
    },
    mounted: function () {
        this.$nextTick(function () {

            $('#getContact').click(getInfoHandler);

            axios.get('/api/shortlist')
                .then(function (response) {
                    let profiles = response.data;
                    profiles.forEach(function(profile){
                        let row = rowInit();
                        if(profile.imageUrl){
                            row.avatar = profile.imageUrl;
                        } else if( profile.photos && profile.photos.length > 0){
                            row.avatar = profile.photos[0];
                        } else {
                            row.avatar = '/img/profile.png';
                        }
                        // row.avatar = profile.imageUrl || (profile.photos && profile.photos.length > 0) ? profile.photos[0]:;
                        row.id = profile.id;
                        row.name = profile.fullName;
                        row.headline = profile.headline;
                        row.location = profile.currentLocation;
                        if(profile.socialLinks){
                            row.socialLinks = profile.socialLinks;
                        }
                        row.socialLinks['linkedin'] = profile.linkedInUrl;
                        row.link = profile.link;
                        row.tags = profile.tags;
                        row.note = profile.note;
                        row.updated = profile.updatedAt;
                        vm.$data.gridData.push(row);
                    });

                })
                .catch(function (error) {
                    console.log('Please contact help@holaconnect.com');
                });
          this.$children[0].sortBy('updated')
        })

    },

    methods:{
        movePages: function(amount) {
            let newStartRow = this.startRow + (amount * this.rowsPerPage);
            if (newStartRow >= 0 && newStartRow < gridData.length) {
                this.startRow = newStartRow;
            }
        },
        removeShortList: function(e){
            debugger;
        }
    }
});
function rowInit() {
    return {
        name:'',
        headline:'',
        location:'',
        socialLinks:{
            'angellist': '',
            'behance': '',
            'dribbble': '',
            'facebook': '',
            'foursquare': '',
            'github': '',
            'google': '',
            'googleplus': '',
            'instagram': '',
            'klout': '',
            'lastfm': '',
            'linkedin': '',
            'myspace': '',
            'pinterest': '',
            'quora': '',
            'reddit': '',
            'tumblr': '',
            'twitter': '',
            'vimeo': '',
            'wordpress': '',
            'youtube': ''
        },
        tags:[],
        note:''
    }
}